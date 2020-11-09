// import React, { useState } from 'react';

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

const axios = require('axios');

const UNISWAP = require('@uniswap/sdk')
const ChainId = UNISWAP.ChainId;
const Token = UNISWAP.Token;
const Fetcher = UNISWAP.Fetcher;
const Trade = UNISWAP.Trade;
const Route = UNISWAP.Route;
const TokenAmount = UNISWAP.TokenAmount;
const TradeType = UNISWAP.TradeType;
const WETH = UNISWAP.WETH;


var app = express();

// let [kyber, setKyberPrice] = useState(0);

// TODO: get pricing off of bancor

app.get("/data/:token1/:token2", (req, res) => {

  /*
  Pricing(req.params.token1, req.params.token2).then(result => {
    // do some processing of result into finalData
    console.log(result)
    res.json({uniswap: result[0], kyber: result[1]});
  })
  */


  Pricing(req.params.token1, req.params.token2)
  .then(result => {
    // do some processing of result into finalData
    res.json({
      oasis: result[0],
      uniswap: result[1],
      kyber: result[2],
    });
  })


  
});

async function Pricing(token1, token2, bancor1, bancor2) {
  
  // var uniswap_price = await Uniswap(token1, token2)
  // var kyber_price = await Kyber(token1, token2)

  prices = await Promise.all([
    Oasis(bancor1, bancor2),
    Uniswap(token1, token2), 
    Kyber(token1, token2)
  ]);

  // console.log(prices)

  return prices
}

async function Oasis(token1, token2) {
  
  var input;
  var output;

  if (token1 == "DAI") {
    input = "dai";
  } else if (token1 == "ETH") {
    input = "eth";
  } else if (token1 == "BNT") {
    input = "bnt";
  } else if (token1 == "USDT") {
    input = "usdt";
  }

  if (token2 == "DAI") {
    output = "dai";
  } else if (token2 == "ETH") {
    output = "eth";
  } else if (token2 == "BNT") {
    output = "bnt";
  } else if (token2 == "USDT") {
    output = "usdt";
  }

  const axios = require("axios");

  var url = "https://api.oasisdex.com/v2/prices/" + input + "/" + output;
  
  let response = await axios.get(url)
    .then(function (res) {
      console.log(res.data.last);
    })
    .catch(function (error) {
      console.log(error);
    });
  // Http.open("GET", url, true)
  // Http.send();
  // return response;
  
}

async function Kyber(token1, token2) {

  const DAI = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
  const USDT = '0xdac17f958d2ee523a2206206994597c13d831ec7'
  const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'

  
  var input;
  var output;
  
  if (token1 == "DAI") {
    input = DAI;
  } else if (token1 == "USDT") {
    input = USDT;
  } else if (token1 == "USDC") {
    input = USDC;
  } 

  if (token2 == "DAI") {
    output = DAI;
  } else if (token2 == "USDT") {
    output = USDT;
  } else if (token2 == "USDC") {
    output = USDC;
  } 


  const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest
  const Http = new XMLHttpRequest();
  
  const url="https://api.kyber.network/buy_rate?id=" + input  + "&qty=1&id=" + output + "&qty=1";
  

  Http.onreadystatechange = async (e) => {

    
      var pricing_json = JSON.parse(Http.responseText);

      var price_1 = await pricing_json.data[0].src_qty[0]
      
      
      var price_2 = await pricing_json.data[1].src_qty[0]

      console.log(price_1/price_2)
      setKyberPrice(price_1/price_2);
      return price_1/price_2
  

    

  };

  Http.open("GET", url, true);
  Http.send();


};


async function Uniswap(token1, token2) {

  const DAI = new Token(ChainId.MAINNET, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18)
  const USDT = new Token(ChainId.MAINNET, '0xdac17f958d2ee523a2206206994597c13d831ec7', 18)
  const USDC = new Token(ChainId.MAINNET, '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 18)
  

  var input;
  var output;
  
  if (token1 == "DAI") {
    input = DAI;
  } else if (token1 == "USDT") {
    input = USDT;
  } else if (token1 == "USDC") {
    input = USDC;
  } 

  if (token2 == "DAI") {
    output = DAI;
  } else if (token2 == "USDT") {
    output = USDT;
  } else if (token2 == "USDC") {
    output = USDC;
  } 


  // note that you may want/need to handle this async code differently,
  // for example if top-level await is not an option


  const pair = await Fetcher.fetchPairData(input, output)
  const route = new Route([pair], input)
  
 

  if (token2 == 'DAI') {
    return route.midPrice.toSignificant(6) / 1000000000000;
  } else if (token1 == 'DAI') {
    return route.midPrice.toSignificant(6) * 1000000000000;
  }
  
  
  return route.midPrice.toSignificant(6)
}




module.exports = app;