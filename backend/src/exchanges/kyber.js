var express = require('express');
var Web3 = require("web3");
var fetch = require("node-fetch");
var Tx = require("ethereumjs-tx").Transaction;

// Connect to Infura's mainnet node
const web3 = new Web3(
  new Web3.providers.HttpProvider("https://mainnet.infura.io/v3/b2e13b0a648e4c67b4a36951f5b1ed62")
); 
const GAS_PRICE = "medium";

const USER_ACCOUNT = "0x514FE66A514a5B73F8E78B31173eE913C810425E";
const PRIVATE_KEY = Buffer.from("d95ae2d664459c8f939a18772579c0d2898325d71411ba475d468a78c1860b1b", "hex");



/**
 * Gets the midprice for the given token pair as well as the inverse midprice.
 * @param tokenFrom An input token of type defined in shared/token.js
 * @param tokenTo An output token of type defined in shared/token.js
 */
async function getPrices(tokenFrom, tokenTo) {

  let address_1 = tokenFrom.mainnet
  let address_2 = tokenTo.mainnet
  
  
  let ratesRequest = await fetch(
     "https://api.kyber.network/sell_rate?id=" +
      address_1 +
      "&qty=1"
  );
  let rates = await ratesRequest.json();
  let input_in_eth = rates.data[0].dst_qty
  
  let ratesRequest_2 = await fetch(
    "https://api.kyber.network/buy_rate?id=" +
       address_2 +
       "&qty=1"
  );
  // Parsing the output
  let rates_2 = await ratesRequest_2.json();
  let output_in_eth = rates_2.data[0].src_qty
  
  let midprice = input_in_eth/output_in_eth
  let inverse = output_in_eth/input_in_eth
  
  // TODO

  return {
    exchange: 'Kyber',
    midprice: midprice,
    inverse: inverse
  };

}




/**
 * Gets the data necessary to execute the given trade.
 */
async function execute_swap(input_token, output_token, input_amount) {

  const input_address = token_addresses_mainnet[input_token]
  const output_address = token_addresses_mainnet[output_token]


   // get trade price 
   let ratesRequest = await fetch(
     "https://api.kyber.network/sell_rate?id=" +
       input_address +
       "&qty=" + input_amount
   );
   let rates = await ratesRequest.json();
   let input_in_eth = rates.data[0].dst_qty
 
   let ratesRequest_2 = await fetch(
     "https://api.kyber.network/buy_rate?id=" +
       output_address +
       "&qty=1"
   );

   let rates_2 = await ratesRequest_2.json();
   let output_in_eth = rates_2.data[0].src_qty
 
   let output_amount = (input_in_eth/output_in_eth)


 
   let result = await Kyber_Token_for_ETH(input_address, input_amount)


   if (result == true) {
     await Kyber_ETH_for_Token(output_address, output_amount)
   }

   return
   
   
}

async function Kyber_Token_for_ETH(token_address, QTY) {


  /*
  ####################################
  ### GET ENABLED STATUS OF WALLET ###
  ####################################
  */

  // Querying the API /users/<user_address>/currencies endpoint
  let enabledStatusesRequest = await fetch(
    "https://api.kyber.network/users/" + USER_ACCOUNT + "/currencies"
  );
  // Parsing the output
  let enabledStatuses = await enabledStatusesRequest.json();
  // Checking to see if DAI is enabled
  let enabled = enabledStatuses.data.some(token => {
    if (token.id == token_address.toLowerCase()) {
      return token.enabled;
    }
  });


  /*
  ####################################
  ### ENABLE WALLET IF NOT ENABLED ###
  ####################################
  */


  if (!enabled) {
    // Querying the API /users/<user_address>/currencies/<currency_id>/enable_data?gas_price=<gas_price> endpoint
    let enableTokenDetailsRequest = await fetch(
      "https://api.kyber.network/users/" +
        USER_ACCOUNT +
        "/currencies/" +
        token_address +
        "/enable_data?gas_price=" +
        GAS_PRICE
    );
    // Parsing the output
    let enableTokenDetails = await enableTokenDetailsRequest.json();
    // Extract the raw transaction details
    let rawTx = enableTokenDetails.data;
    
    
    // Create a new transaction
    let tx = new Tx(rawTx);
    // Signing the transaction
    tx.sign(PRIVATE_KEY);
    // Serialise the transaction (RLP encoding)
    let serializedTx = tx.serialize();
    // Broadcasting the transaction
    txReceipt = await web3.eth
      .sendSignedTransaction("0x" + serializedTx.toString("hex"))
      .catch(error => console.log(error));
    // Log the transaction receipt

    console.log(txReceipt);
  }
  

  /*
  ####################################
  ### GET DAI/ETH CONVERSION RATES ###
  ####################################
  */

  // Querying the API /sell_rate endpoint
  let ratesRequest = await fetch(
    "https://api.kyber.network/sell_rate?id=" +
      token_address +
      "&qty=" +
      QTY
  );
  // Parsing the output
  let rates = await ratesRequest.json();
  // Getting the source quantity
  let dstQty = rates.data[0].dst_qty;

  /*
  #######################
  ### TRADE EXECUTION ###
  #######################
  */

  // Querying the API /trade_data endpoint
  // Note that a factor of 0.97 is used to account for slippage but you can use any value you want.
  tradeDetailsRequest = await fetch(
    "https://api.kyber.network/trade_data?user_address=" +
      USER_ACCOUNT +
      "&src_id=" +
      token_address+
      "&dst_id=" +
      ETH_TOKEN_ADDRESS +
      "&src_qty=" +
      QTY +
      "&min_dst_qty=" +
      dstQty * 0.97 +
      "&gas_price=" +
      GAS_PRICE 
  );
  // Parsing the output
  let tradeDetails = await tradeDetailsRequest.json();
  // Extract the raw transaction details
  rawTx = tradeDetails.data[0];

  // Create a new transaction
  let tx = new Tx(rawTx);
  // Signing the transaction
  tx.sign(PRIVATE_KEY);
  // Serialise the transaction (RLP encoding)
  serializedTx = tx.serialize();
  // Broadcasting the transaction
  txReceipt = await web3.eth
  .sendSignedTransaction("0x" + serializedTx.toString("hex"))
  .catch(error => 
      {
        console.log(error) 
        return false
      }
    );
  // Log the transaction receipt

  console.log(txReceipt);

  return true

  
  
}




async function Kyber_ETH_for_Token(token_address, QTY) {

 
  // Querying the API /buy_rate endpoint
  let ratesRequest = await fetch(
    "https://api.kyber.network/buy_rate?id=" +
      token_address +
      "&qty=" + QTY
  );

  // Parsing the output
  let rates = await ratesRequest.json();
  // Getting the source quantity
  // srcQty is equal to how much Eth to purchase the output token
  let srcQty = rates.data[0].src_qty;

  /*
  #######################
  ### TRADE EXECUTION ###
  #######################
  */

  // Querying the API /trade_data endpoint
  // Note that a factor of 0.97 is used to account for slippage but you can use any value you want.
  let tradeDetailsRequest = await fetch(
    "https://api.kyber.network/trade_data?user_address=" +
      USER_ACCOUNT +
      "&src_id=" +
      ETH_TOKEN_ADDRESS +
      "&dst_id=" +
      token_address +
      "&src_qty=" +
      srcQty+
      "&min_dst_qty=" +
      QTY * 0.97 +
      "&gas_price=" +
      GAS_PRICE 
  );
  // Parsing the output
  let tradeDetails = await tradeDetailsRequest.json();
  // Extract the raw transaction details
  let rawTx = tradeDetails.data[0];
  
  // Incrementing the nonce. This is only necessary when this is the second transaction in a row
  // as the nonce will not be set correctly by default.
  rawTx["nonce"] = "0x" + (parseInt(rawTx["nonce"]) +1).toString(16)

  // Create a new transaction
  let tx = new Tx(rawTx);
  // Signing the transaction
  tx.sign(PRIVATE_KEY);
  // Serialise the transaction (RLP encoding)
  let serializedTx = tx.serialize();
  // Broadcasting the transaction
  txReceipt = await web3.eth
    .sendSignedTransaction("0x" + serializedTx.toString("hex"))
    .catch(error => console.log(error));
  // Log the transaction receipt
  console.log(txReceipt);

  return 

}



module.exports = { getData, getPrices };
