import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

const fcl = require("@onflow/fcl");
fcl.config()
  .put("accessNode.api", "https://flow-testnet.g.alchemy.com:443",)
  .put("grpc.metadata", {"api_key": "r9uf5vfdb09lnpdrltb6wprq6ta5e13s"}).put(
    'discovery.wallet',
    'https://flow-wallet-testnet.blocto.app/api/flow/authn'
  ).put('discovery.wallet.method', 'HTTP/POST'); 
  // access through alchemy^^^^^ DONT USE BEFORE ADDITIONAL RESEARCH ABOUT TRIAL
  
  

  // fcl.config()
  // .put("accessNode.api", "http://localhost:8080",)
  // .put("discovery.wallet", "http://localhost:8701/fcl/authn")

  const SIMPLE_TRANSACTION = `\
  
  import FlowToken from 0x7e60df042a9c0868
  import FungibleToken from 0x9a0766d93b6608b7

transaction(price:UFix64,acct2Transfer:Address) {
    var amount : UFix64 
    prepare(providerAccount: AuthAccount) {
      let receiverRef =  getAccount(0x230f446f2d449742)
      .getCapability(/public/flowTokenReceiver)
      .borrow<&{FungibleToken.Receiver}>()
?? panic("Could not borrow receiver reference to the recipient's Vault")
        let vaultRef = providerAccount.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
                ?? panic("Could not borrow buyer vault reference")
        let temporaryVault <- vaultRef.withdraw(amount: price)

        receiverRef.deposit(from: <-temporaryVault)
        
    }
  //   fun retAmount(): UFix64 {
  //     return amount
  // }
    execute{
      retAmount()
    }
} 
`

const SIMPLE_PRINT_SCRIPT = `\
  
  import ExampleNFT from 0x20a1514850974256

pub fun main(recipient: Address) :[UInt64]{
    let nftOwner = getAccount(recipient)

    let capability = nftOwner.getCapability<&{ExampleNFT.NFTReceiver}>(ExampleNFT.CollectionPublicPath)

    let receiverRef = capability.borrow()
        ?? panic("Could not borrow the receiver reference")

    log("Account 2 NFTs")
    log(receiverRef.getIDs())
    return receiverRef.getIDs()
}
`

const MINT = `\

// Mint NFT

import ExampleNFT from 0x20a1514850974256

// This transaction allows the Minter account to mint an NFT
// and deposit it into its collection.

transaction {

    // The reference to the collection that will be receiving the NFT
    let receiverRef: &{ExampleNFT.NFTReceiver}

    // The reference to the Minter resource stored in account storage
    
    let addr: Address

    prepare(acct: AuthAccount) {
        self.receiverRef = acct.getCapability<&{ExampleNFT.NFTReceiver}>(/public/NFTReceiver).borrow()!
        self.addr = acct.address
    }

    execute {
        let minterRef = getAccount(0x20a1514850974256).getCapability<&ExampleNFT.NFTMinter>(/public/Minter).borrow()
        ?? panic("couldnt borrow accounts minter")

        // Use the minter reference to mint an NFT, which deposits
        // the NFT into the collection that is sent as a parameter.
        let newNFT <- minterRef.mintNFT(
          founder: self.addr,
          royaltyPercent: 0.2
        )

        self.receiverRef.deposit(token: <-newNFT)

        log("NFT Minted and deposited to Account 2's Collection")
    }
}
    `

const BUY_NFT = `\

import FlowToken from 0x7e60df042a9c0868
import ExampleNFT from 0x20a1514850974256
import FungibleToken from 0x9a0766d93b6608b7
import ExampleMarketplace from 0x20a1514850974256


transaction {

    
    let collectionCapability: Capability<&AnyResource{ExampleNFT.NFTReceiver}>

    
    let temporaryVault: @FungibleToken.Vault

    prepare(acct: AuthAccount) {

        self.collectionCapability = acct.getCapability<&AnyResource{ExampleNFT.NFTReceiver}>(ExampleNFT.CollectionPublicPath)

        let vaultRef = acct.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow owner's vault reference")

        self.temporaryVault <- vaultRef.withdraw(amount: 0.00001)
    }

    execute {
        let seller = getAccount(0xf8d6e0586b0a20c7)

        let saleRef = seller.getCapability(/public/NFTSale)
                            .borrow<&AnyResource{ExampleMarketplace.SalePublic}>()
                            ?? panic("Could not borrow seller's sale reference")

        saleRef.purchase(tokenID: 1, recipient: self.collectionCapability, buyTokens: <-self.temporaryVault)

        log("Token 1 has been bought by account 2!")
    }
}
    `

const PREP_SALE = `\

import FlowToken from 0x7e60df042a9c0868

import ExampleNFT from 0x20a1514850974256

import FungibleToken from 0x9a0766d93b6608b7
import ExampleMarketplace from 0x20a1514850974256


  transaction {

  prepare(acct: AuthAccount) {

      
      let receiver = acct.getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)

      
      let collectionCapability = acct.link<&ExampleNFT.Collection>(/private/nftTutorialCollection, target: ExampleNFT.CollectionStoragePath)
        ?? panic("Unable to create private link to NFT Collection")

      
      let sale <- ExampleMarketplace.createSaleCollection(ownerCollection: collectionCapability, ownerVault: receiver)

     
      sale.listForSale(tokenID: 2, price: 50.0)

     
      acct.save(<-sale, to: /storage/NFTSale)

      acct.link<&ExampleMarketplace.SaleCollection{ExampleMarketplace.SalePublic}>(/public/NFTSale, target: /storage/NFTSale)

      log("Sale Created for account 1. Selling NFT 1 for 10 tokens")
  }

}
  `

const PRE_ACCT = `\

import ExampleNFT from 0x20a1514850974256


transaction {
    prepare(acct: AuthAccount) {

        let collection <- ExampleNFT.createEmptyCollection()

        acct.save<@ExampleNFT.Collection>(<-collection, to: ExampleNFT.CollectionStoragePath)

        log("Collection created for account 1")

        acct.link<&{ExampleNFT.NFTReceiver}>(ExampleNFT.CollectionPublicPath, target: ExampleNFT.CollectionStoragePath)

        log("Capability created")
    }
}
`
const PREP_AUCTION = `\

// Transaction1.cdc
import FungibleToken from 0xf8d6e0586b0a20c7
import ExampleNFT from 0xf8d6e0586b0a20c7
import Auction from 0xf8d6e0586b0a20c7


transaction {

    // No need to do anything in prepare because we are not working with
    // account storage.
	prepare(acct: AuthAccount) {
    let receiver = acct.getCapability<&{FungibleToken.Receiver}>(/public/Receiver)
    let auctionHouse <- Auction.createAuctionCollection(marketplaceVault: receiver,cutPercentage:0.1)
    
			
		// Store the vault in the account storage
	
    // Create a new empty collection
    
    
    // store the empty NFT Collection in account storage
    
    acct.save(<- auctionHouse, to: /storage/AuctionHouse)
    

    acct.link<&{Auction.AuctionPublic}>(/public/AuctionPublic, target: /storage/AuctionHouse)
    
    
    log("Auction created and stored at Signer account")
    log("Collection created for account 1")
    }

    // In execute, we simply call the hello function
    // of the HelloWorld contract and log the returned String.
	execute {
	  	
	}
}
`
const PLACE_BID = `\

import ExampleNFT from 0x20a1514850974256
import Auction from 0x20a1514850974256

import FlowToken from 0x7e60df042a9c0868

import FungibleToken from 0x9a0766d93b6608b7

transaction() {

    let vaultCap: Capability<&{FungibleToken.Receiver}>
    let collectionCap: Capability<&{ExampleNFT.NFTReceiver}> 
    
    

    prepare(account: AuthAccount) {

        var collectionCap = account.getCapability<&{ExampleNFT.NFTReceiver}>(/public/NFTReceiver)

        if !collectionCap.check() {
					  account.unlink(ExampleNFT.CollectionPublicPath)
					  destroy <- account.load<@AnyResource>(from:ExampleNFT.CollectionStoragePath)
            

            account.link<&{ExampleNFT.NFTReceiver}>(ExampleNFT.CollectionPublicPath, target: ExampleNFT.CollectionStoragePath)
        }
        let collectionRef = account.borrow<&ExampleNFT.Collection>(from: /storage/NFTCollection)
            ?? panic("Could not borrow a reference to the owner's collection")

        
        self.collectionCap=collectionCap
        
        self.vaultCap = account.getCapability<&FlowToken.Vault{FungibleToken.Receiver}>(/public/flowTokenReciver)
                   
        let vaultRef = account.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow owner's Vault reference")

        let auctionHouseAdmin = getAccount(0x20a1514850974256)
        
        let auctionRef = auctionHouseAdmin.getCapability<&{Auction.AuctionPublic}>(/public/AuctionPublic).borrow()
            ?? panic("Could not borrow auction")
            
        auctionRef.placeBid(id: 3,bidTokens: <-vaultRef.withdraw(amount: 10.0),vaultCap: self.vaultCap,collectionCap: self.collectionCap)
    }
   

    execute {
        
    }
}
`
const PRE_ACCT_VAULT = `\

// Transaction3.cdc
import FungibleToken from 0xf8d6e0586b0a20c7



// This transaction configures a user's account
// to use the NFT contract by creating a new empty collection,
// storing it in their account storage, and publishing a capability
transaction {
    prepare(acct: AuthAccount) {

        // Create a new empty collection
        
        let vaultA <- FungibleToken.createEmptyVault()
			
		// Store the vault in the account storage
	acct.save<@FungibleToken.Vault>(<-vaultA, to: /storage/Vault)
    // Create a new empty collection
    
    let ReceiverRef = acct.link<&FungibleToken.Vault{FungibleToken.Receiver, FungibleToken.Balance}>(/public/Receiver, target: /storage/Vault)
        // store the empty NFT Collection in account storage
        

        
    }
}
 
`

const PLACE_PROP = `\
import ExampleNFT from 0x20a1514850974256
import Auction from 0x20a1514850974256


import FungibleToken from 0xf8d6e0586b0a20c7

// Transaction to make a bid in a marketplace for the given dropId and auctionId
transaction() {
    // reference to the buyer's NFT collection where they
    // will store the bought NFT

    let vaultCap: Capability<&{FungibleToken.Receiver}>
    let collectionCap: Capability<&{ExampleNFT.NFTReceiver}> 
    
    

    prepare(account: AuthAccount) {

        // get the references to the buyer's Vault and NFT Collection receiver
        var collectionCap = account.getCapability<&{ExampleNFT.NFTReceiver}>(/public/NFTReceiver)

        // if collection is not created yet we make it.
        if !collectionCap.check() {
					  account.unlink(ExampleNFT.CollectionPublicPath)
					  destroy <- account.load<@AnyResource>(from:ExampleNFT.CollectionStoragePath)
            // store an empty NFT Collection in account storage
            

            // publish a capability to the Collection in storage
            account.link<&{ExampleNFT.NFTReceiver}>(ExampleNFT.CollectionPublicPath, target: ExampleNFT.CollectionStoragePath)
        }
        let collectionRef = account.borrow<&ExampleNFT.Collection>(from: /storage/NFTCollection)
            ?? panic("Could not borrow a reference to the owner's collection")

        

        // Call the withdraw function on the sender's Collection
        // to move the NFT out of the collection
        
        // Call the withdraw function on the sender's Collection
        // to move the NFT out of the collection
        
        self.collectionCap=collectionCap
        
        self.vaultCap = account.getCapability<&FlowToken.Vault{FungibleToken.Receiver}>(/public/flowTokenReciver)
                   
        let vaultRef = account.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow owner's Vault reference")

        let auctionHouseAdmin = getAccount(0x20a1514850974256)
        
        let auctionRef = auctionHouseAdmin.getCapability<&{Auction.AuctionPublic}>(/public/AuctionPublic).borrow()
            ?? panic("Could not borrow auction")
            
        
        auctionRef.createAuction(
            token: <- collectionRef.withdraw(withdrawID: 2), 
            minimumBidIncrement: 0.0, 
            auctionLength: 1000000.0, 
            auctionStartTime: getCurrentBlock().timestamp,
            startPrice: 10.0, 
            collectionCap: self.collectionCap, 
            vaultCap: self.vaultCap) 
    }
    

    
}
 
`
const SETTLE_AUC = `\

import Auction from 0x20a1514850974256

transaction() {


    prepare(account: AuthAccount) {

    
        
      let auctionHouseAdmin = getAccount(0x20a1514850974256)
        let auctionRef = account.borrow<&Auction.AuctionCollection>(from: /storage/AuctionHouse)
            ?? panic("Could not borrow auction")
            
        
        auctionRef.changeLength(id:3,amount:0.0)
        auctionRef.settleAuction(3)
    }
}
`
async function settle(){

  const tx = await fcl.send([
    fcl.transaction(SETTLE_AUC),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
  ])
  

  var transaction = await fcl.tx(tx).onceSealed().finally(() => {

  })
  console.log(transaction)
  
}
async function placeBid(){

  const tx = await fcl.send([
    fcl.transaction(PLACE_BID),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
  ])
  

  var transaction = await fcl.tx(tx).onceSealed().finally(() => {

  })
  console.log(transaction)
  
}
async function mint(){

  const tx = await fcl.send([
    fcl.transaction(MINT),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
  ])
  

  var transaction = await fcl.tx(tx).onceSealed().finally(() => {

  })
  console.log(transaction)
  
}
async function placeProposal(){
  
  
  
  const tx = await fcl.send([
    fcl.transaction(PLACE_PROP),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
  ])

}
async function prepACcountVault(){
  
  
  
  const tx = await fcl.send([
    fcl.transaction(PRE_ACCT_VAULT),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
  ])

}
async function unauth(){
  fcl.currentUser.unauthenticate()
  const currentUser = await fcl.currentUser().snapshot()
  console.log("The Current User", currentUser)
}

async function auth(){
  fcl.authenticate()
  const currentUser = await fcl.currentUser().snapshot()
  console.log("The Current User", currentUser)
}

async function buyNFT(){
  
  
  
  const tx = await fcl.send([
    fcl.transaction(BUY_NFT),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
  ])

}
async function prepAuction(){
  
  
  
  const tx = await fcl.send([
    fcl.transaction(PREP_AUCTION),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
  ])

}
async function prepareSale(){
  
  fcl.authenticate()
  
  const tx = await fcl.send([
    fcl.transaction(PREP_SALE),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
  ])

  
}

async function prepare(){
  
  const tx = await fcl.send([
    fcl.transaction(PRE_ACCT),
    fcl.proposer(fcl.currentUser().authorization),
    fcl.authorizations([
      fcl.currentUser().authorization,
    ]),
    fcl.payer(fcl.currentUser().authorization),
    fcl.limit(1000),
  ])
  

  var transaction = await fcl.tx(tx).onceSealed().finally(() => {

  })
  console.log(transaction)
  
}
async function print(){
  const currentUser = await fcl.currentUser().snapshot()
  const addr = currentUser.addr
  
const result = await fcl.query({
  cadence: SIMPLE_PRINT_SCRIPT,
  args: (arg, t) => [arg(addr, t.Address)],
});

  
console.log(result);


}

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        

      

        <div className={styles.grid}>
        <button
        onClick={mint}
        >
          mint
        </button>
        <button
        onClick={unauth}
        >
        unauth
        </button>
        <button
        onClick={auth}
        >
          auth
        </button>
        {/* <button
        onClick={func}
        >
          clikome
        </button> */}
        <button
        onClick={buyNFT}
        >
        buyNFT
        </button>
        <button
        onClick={prepare}
        >
          prepare account
        </button>
        
        <button
        onClick={print}
        >
          printNFTS

        </button>
        <button
        onClick={prepareSale}
        >
          prepare sale of nft 1
        </button> 
        </div>
        <div>
          <button
          onClick={prepAuction}
          >
          prepAuction
          </button>
          <button onClick={prepACcountVault}>
          prepACcountVault
          </button>
          <button onClick={placeProposal}>
          placeProposal
          </button>
          <button
          onClick={placeBid}
          >
          placeBid
          </button>
          <button
          onClick={settle}
          >
          settle
          </button>
          
        </div>
      </main>

      
        
      
    </div>
  )
}
