const fs = require('fs');
const async = require('async');
const sharp = require('sharp');

const offsetBand = 20;
const gridDimensions = 12;
//bool[,] squares
function GetAvailableSquares(squares)
{
  results = [];
  for (let x = 0; x < squares.length; ++x)
  {
    for (let y = 0 ; y < squares[x].length; ++y)
    {
      if (squares[x][y]) results.push({x, y});
    }
  }
  return results;
}
//bool[,] squares, int requiredSquaresWidth, int requiredSquaresHeight)
function GetValidSquares(squares, requiredSquaresWidth, requiredSquaresHeight)
{
  return GetAvailableSquares(squares).filter(s => IsSquareValid(squares, s, requiredSquaresWidth, requiredSquaresHeight));
}
//bool[,] squares, Point attemptedSquare, int requiredSquaresWidth, int requiredSquaresHeight)
function IsSquareValid(squares, attemptedSquare, requiredSquaresWidth, requiredSquaresHeight)
{
  for (let x = 0; x < requiredSquaresWidth; ++x)
  {
    for (let y = 0; y < requiredSquaresHeight; ++y)
    {
      if (!squares[attemptedSquare.x + x][ attemptedSquare.y + y])
      {
        return false;
      }
    }
  }
  return true;
}

function LogSquares(squares){
  for (let x = 0; x < squares.length; ++x)
  {
    let lineStr = ''
    for (let y = 0 ; y < squares[x].length; ++y)
    {
      lineStr += squares[x][y]?'   ':' X '; 
    }
    console.log(lineStr);
  }
}

function GetCharPositioning(baseWidth, baseHeight, charImgWidth, charImgHeight)
{
  //To prevent overlapping chars:
  //Divide it into a grid of 12 x 12.
  const gridSquareWidth = baseWidth / gridDimensions;
  const gridSquareHeight = baseHeight / gridDimensions;

  const availableSquares = new Array(gridDimensions);
  for (let x = 0; x < gridDimensions; ++x)
  {
    availableSquares[x] = new Array(gridDimensions);
    for (let y = 0; y < gridDimensions; ++y)
    {
      //Leave clear the outer band and center squares.
      availableSquares[x][y] = (
                          x != 0 && x != gridDimensions - 1 && 
                          y != 0 && y != gridDimensions - 1 && 
                          !((x == 5 || x == 6) && (y == 5 || y == 6)));
    }
  }
  
  //for (let x = 0; x < gridDimensions; ++x)
  //{
  //    //Leave clear the outer band.
  //    if (x == 0 || x == gridDimensions - 1) continue;
  //    for (let y = 0; y < gridDimensions; ++y)
  //    {
  //        //Leave clear the outer band.
  //        if (y == 0 || y == gridDimensions - 1) continue;
  //        //Leave clear the middle square.
  //        if ((x == 5 || x == 6) && (y == 5 || y == 6)) continue;
  //        availableSquares.Add(new Point(x, y));
  //    }
  //}
  const positionings = [];
  const minWidth = gridSquareWidth;
  const minHeight = gridSquareHeight;
  const maxWidth = 4.0 * minWidth;
  const maxHeight = 4.0 * minHeight;

  const numChars = 5 + Math.floor(Math.random() * 4);
  //console.log(`desired nr of chars: ${numChars}`);
  for (let i = 0; i < numChars; ++i)
  {
    //console.log(`begin trying for char index ${i}`);
    let succeeded = false;
    let myMaxWidth = maxWidth;
    let myMaxHeight = maxHeight;
    while(!succeeded && myMaxWidth > 0 && myMaxHeight > 0 )
    {
      //Pick a random non-occupied square.
      const desiredWidth = minWidth + Math.random() * (myMaxWidth - minWidth);
      const desiredHeight = minHeight + Math.random() * (myMaxHeight - minHeight);
      const scaleX = desiredWidth / charImgWidth;
      const scaleY = desiredHeight / charImgHeight;
      const scale = (Math.round(Math.random()) == 0) ? scaleX : scaleY;
      
      const width = charImgWidth * scale;
      const height = charImgHeight * scale;

      const reqSW = Math.ceil(width / gridSquareWidth);
      const reqSH = Math.ceil(height / gridSquareHeight);
      //console.log(`${reqSW}x${reqSH}`);

      //LogSquares(availableSquares);

      const squares = GetValidSquares(availableSquares, reqSW, reqSH);
      if (squares.length == 0) { 
        //console.log(`fail`);
        myMaxWidth = (reqSW - 1) * gridSquareWidth;
        myMaxHeight = (reqSH - 1) * gridSquareHeight;
      }
      else{
        succeeded = true;
        //console.log(`squares found`)
        const square = squares[Math.floor(Math.random() * (squares.length-1))];

        const xPos = square.x * gridSquareWidth;
        const yPos = square.y * gridSquareHeight;

        positionings.push({x: xPos, y: yPos, w: width, h: height});
        for (let x = 0; x < reqSW; ++x)
        {
          for (let y = 0; y < reqSH; ++y)
          {
            availableSquares[square.x + x][square.y + y] = false;
          }
        }
        //console.log('------')
        //LogSquares(availableSquares);
      }
    }
  }
  return positionings;
}

//Image baseImg, string speedLinePath, string[] menacingCharPaths)
function MakeMenacing(baseImg, baseWidth, baseHeight, speedLinePath, menacingCharPaths, finalCallback)
{
  let chosenCharImg = null;
  let resultImg = null;
  function CharPosToOverlayFunction(charPos)
  {
    return function(callback){
      sharp(chosenCharImg).
        resize(Math.round(charPos.w), Math.round(charPos.h)).
        toBuffer(function(err, buff, info) {
          callback(err, {img:buff, x:charPos.x, y:charPos.y});
        });
    }
  }
  async.waterfall([
    function(callback){
      sharp(speedLinePath)
        .resize(baseWidth, baseHeight)
        .toBuffer(callback);
    },
    function(linesBuffer, info, callback){
      sharp(baseImg)
        .overlayWith(linesBuffer)
        .toBuffer(callback);
    },
    function(imgBuffer, info, callback){
      resultImg = imgBuffer;
      //Add a bunch of menacing characters.
      const chosenChar = menacingCharPaths[Math.floor(Math.random() * (menacingCharPaths.length-1))];
      fs.readFile(chosenChar, callback);
    },
    function(charImg, callback){
      chosenCharImg = charImg;
      sharp(charImg).
        metadata(callback);
      },
    function(metadata, callback){      
      const overlayFunctions = GetCharPositioning(baseWidth, baseHeight, metadata.width, metadata.height).
        map(CharPosToOverlayFunction);  
      //console.log(overlayFunctions.length)
      async.series(overlayFunctions, callback);
    },
    function(results, callback){
      //console.log(results.length);
      async.reduce(results, resultImg,
        function(prev, result, seriesCallback){
          sharp(prev).
            overlayWith(result.img, {left: Math.round(result.x), top: Math.round(result.y)} ).
            toBuffer(seriesCallback);
        }, 
        callback);   
    },
  ],
  function(err, img, info){
    finalCallback(err, img);
  });  
}

module.exports = MakeMenacing;
