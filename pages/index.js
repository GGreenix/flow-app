import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

const fcl = require("@onflow/fcl");
// fcl.config()
//   .put("accessNode.api", "https://flow-testnet.g.alchemy.com:443",)
//   .put("grpc.metadata", {"api_key": "r9uf5vfdb09lnpdrltb6wprq6ta5e13s"}).put(
//     'discovery.wallet',
//     'https://flow-wallet-testnet.blocto.app/api/flow/authn'
//   ).put('discovery.wallet.method', 'HTTP/POST'); 
  // access through alchemy^^^^^ DONT USE BEFORE ADDITIONAL RESEARCH ABOUT TRIAL
  
  

  fcl.config()
  .put("accessNode.api", "http://localhost:8080",)
  .put("discovery.wallet", "http://localhost:8701/fcl/authn")

  const SIMPLE_TRANSACTION = `\
  
  import FlowToken from 0x0ae53cb6e3f42a79
  import FungibleToken from 0xee82856bf20e2aa6

transaction(price:UFix64,acct2Transfer:Address) {
    var amount : UFix64 
    prepare(providerAccount: AuthAccount) {
        
        let vaultRef = providerAccount.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
                ?? panic("Could not borrow buyer vault reference")
        let temporaryVault <- vaultRef.withdraw(amount: price)

        amount = temporaryVault.balance
        destroy temporaryVault
        
    }
    fun retAmount(): UFix64 {
      return amount
  }
    execute{
      retAmount()
    }
} 
`

const SIMPLE_PRINT_SCRIPT = `\
  
  import ExampleNFT from 0xf8d6e0586b0a20c7

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


import ExampleNFT from 0xf8d6e0586b0a20c7



transaction {

    let receiverRef: &{ExampleNFT.NFTReceiver}

    let minterRef: &ExampleNFT.NFTMinter

    prepare(acct: AuthAccount) {
        self.receiverRef = acct.getCapability<&{ExampleNFT.NFTReceiver}>(ExampleNFT.CollectionPublicPath)
            .borrow()
            ?? panic("Could not borrow receiver reference")
        
        self.minterRef = acct.borrow<&ExampleNFT.NFTMinter>(from: ExampleNFT.MinterStoragePath)
            ?? panic("could not borrow minter reference")
    }

    execute {

        let newNFT <- self.minterRef.mintNFT()

        self.receiverRef.deposit(token: <-newNFT)

        log("NFT Minted and deposited to Account 2's Collection")
    }
}
    `

const BUY_NFT = `\

import FlowToken from 0x0ae53cb6e3f42a79
import ExampleNFT from 0xf8d6e0586b0a20c7
import FungibleToken from 0xee82856bf20e2aa6
import ExampleMarketplace from 0xf8d6e0586b0a20c7


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

import FungibleToken from 0xee82856bf20e2aa6
import ExampleNFT from 0xf8d6e0586b0a20c7
import ExampleMarketplace from 0xf8d6e0586b0a20c7


  transaction {

  prepare(acct: AuthAccount) {

      
      let receiver = acct.getCapability<&{FungibleToken.Receiver}>(/public/flowTokenReceiver)

      
      let collectionCapability = acct.link<&ExampleNFT.Collection>(/private/nftTutorialCollection, target: ExampleNFT.CollectionStoragePath)
        ?? panic("Unable to create private link to NFT Collection")

      
      let sale <- ExampleMarketplace.createSaleCollection(ownerCollection: collectionCapability, ownerVault: receiver)

     
      sale.listForSale(tokenID: 1, price: 10.0)

     
      acct.save(<-sale, to: /storage/NFTSale)

      acct.link<&ExampleMarketplace.SaleCollection{ExampleMarketplace.SalePublic}>(/public/NFTSale, target: /storage/NFTSale)

      log("Sale Created for account 1. Selling NFT 1 for 10 tokens")
  }

}
  `

const PRE_ACCT = `\

import ExampleNFT from 0xf8d6e0586b0a20c7


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
      </main>

      
        
      
    </div>
  )
}
