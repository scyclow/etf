
import {$} from '../$.js'
import {provider, bnToN, isENS, ethVal, ethValue, ZERO_ADDR} from '../eth.js'



const etherscanPrefix = async () => (await provider.getNetwork()) === 'sepolia' ? 'sepolia.' : ''


provider.setContractInfo(CONTRACTS)

let ETF, AP, AUCTION, KYC, bidFilter
provider.onConnect(async (addr) => {
  try {
    ({ ETF, AP, AUCTION, KYC } = await provider.getContracts())
    bidFilter = AUCTION.filters.BidMade(AUCTION_ID)
  } catch (e) {
    console.error(e)
  }
})




const $lastUpdated = $.id('lastUpdated')
const $connectedAs1 = $.id('connectedAs1')
const $connectedAs2 = $.id('connectedAs2')
const $connectedBalance = $.id('connectedBalance')
const $connectedNetwork = $.id('connectedNetwork')
const $submitBid = $.id('submitBid')
const $newBidAmount = $.id('newBidAmount')
const $timeLeftSection = $.id('timeLeftSection')
const $activeBidSection = $.id('activeBidSection')
const $highestBidSection = $.id('highestBidSection')
const $makeBidSection = $.id('makeBidSection')
const $timeLeft = $.id('timeLeft')
const $timeDiff = $.id('timeDiff')
const $bidSectionContent = $.id('bidSectionContent')
const $bidSectionError = $.id('bidSectionError')
const $bidSectionLoadingMessage = $.id('bidSectionLoadingMessage')
const $bidSectionLoading = $.id('bidSectionLoading')
const $highestBidAmount = $.id('highestBidAmount')
const $highestBidder = $.id('highestBidder')
const $bidHistory = $.id('bidHistory')
const $previousBidList = $.id('previousBidList')
const $highestBidLabel = $.id('highestBidLabel')
const $bidderSecondaryInfo = $.id('bidderSecondaryInfo')

const $settlementSection = $.id('settlementSection')
const $settlementSectionContent = $.id('settlementSectionContent')
const $submitSettlement = $.id('submitSettlement')
const $settlementSectionError = $.id('settlementSectionError')
const $settlementSectionLoading = $.id('settlementSectionLoading')
const $settlementSectionLoadingMessage = $.id('settlementSectionLoadingMessage')

const $question = $.id('question')
const $answer = $.id('answer')
const $answerX = $.id('answerX')
const $answerContent = $.id('answerContent')

const $biddingHelp = $.id('biddingHelp')
// const $wantsNotifications = $.id('wantsNotifications')




let notificationPermission, lastBid

// if ($wantsNotifications) $wantsNotifications.onclick = () => {
//   if ($wantsNotifications.checked) {
//     notificationPermission = Notification.requestPermission()
//   } else {
//     notificationPermission = false
//   }
// }

let stopActiveCountdownInterval = () => {}
let setMinBid = false
async function updateBidInfo(signer, steviepAuction, ap) {
  const signerAddr = await signer.getAddress()

  const [
    connectedBalance,
    connectedNetwork,
    formattedAddr,
  ] = await Promise.all([
    provider.getETHBalance(signerAddr),
    provider.getNetwork(),
    provider.formatAddr(signerAddr, provider),
  ])

  if (isENS(formattedAddr)) {
    $connectedAs1.innerHTML = formattedAddr
  }
  $connectedAs2.innerHTML = `<a href="https://${await etherscanPrefix()}etherscan.io/address/${signerAddr}" target="_blank" class="address">${signerAddr}</a>`

  let networkName, networkDescriptor
  if (connectedNetwork.name && connectedNetwork.name !== 'unknown') {
    networkName = connectedNetwork.chainId === 1 ? 'mainnet' : connectedNetwork.name
    networkDescriptor = 'Network'
  } else {
    networkName = connectedNetwork.chainId
    networkDescriptor = 'Network ID'
  }

  $connectedNetwork.innerHTML = `${networkDescriptor}: ${networkName}`

  const [
    highestBid,
    auction,
    auctionEndTime,
    isActive,
    isSettled,
    tokenOwner,
    blockNumber,
  ] = await Promise.all([
    steviepAuction.auctionIdToHighestBid(AUCTION_ID),
    steviepAuction.auctionIdToAuction(AUCTION_ID),
    steviepAuction.auctionEndTime(AUCTION_ID),
    steviepAuction.isActive(AUCTION_ID),
    steviepAuction.isSettled(AUCTION_ID),
    ap.ownerOf(AP_ID),
    provider.provider.getBlockNumber(),
  ])

  const isOwnedByContract = tokenOwner === steviepAuction.address



  const hasBid = !!bnToN(highestBid.timestamp)
  const blockTimestamp = (await provider.provider.getBlock(blockNumber)).timestamp
  const timeDiff = Date.now() - blockTimestamp*1000

  $lastUpdated.innerHTML = `Local timestamp: ${new Date()} <br>Block timestamp: ${new Date(blockTimestamp*1000)}<br>[Block: ${blockNumber}]<br><strong><a href="https://${await etherscanPrefix()}etherscan.io/address/${steviepAuction.address}" target="_blank" rel="nofollow" style="font-family:monospace">AUCTION CONTRACT</a></strong>`



  if (!hasBid) {
    hide($bidHistory)
    if (isOwnedByContract) unhide($makeBidSection)
    if (!setMinBid) $newBidAmount.value = formatMinBid(ethVal(auction.minBid))

  } else if (isActive) {
    if (isOwnedByContract) unhide($makeBidSection)
    unhide($timeLeftSection)
    unhide($highestBidSection)
    unhide($activeBidSection)
    unhide($bidHistory)
    if (!setMinBid) $newBidAmount.value = formatMinBid(ethVal(highestBid.amount) * (1 + auction.bidIncreaseBps/10000))

    const bidAmount = ethVal(highestBid.amount)
    $highestBidAmount.innerHTML = `${bidAmount} ETH</div>`
    $highestBidder.innerHTML = `<a href="https://${await etherscanPrefix()}etherscan.io/address/${highestBid.bidder}" target="_blank" class="address">${await provider.formatAddr(highestBid.bidder, false, 42)}</a>`


    stopActiveCountdownInterval()
    const timeLeft = bnToN(auctionEndTime)*1000 - Date.now()
    stopActiveCountdownInterval = triggerTimer(timeLeft, $timeLeft)
    if (timeLeft < 120000) $timeDiff.innerHTML = `*Your web browser is <br>~${Math.abs(timeDiff/1000)} seconds ${timeDiff < 0 ? 'behind' : 'ahead of'} <br>the blockchain`

    if (!lastBid) {
      lastBid = bidAmount
    } else if (notificationPermission && (bidAmount !== lastBid)) {
      lastBid = bidAmount

      notificationPermission.then(p => {
        const notification = new Notification(`💵 New Cold Hard Cash Bid 💵`, {
          body: `${auctionData[AUCTION_ID].title} → ${bidAmount} ETH`,
          icon: `../assets/${AUCTION_ID}.jpg`,
          requireInteraction: true
        })
      })
    } else if (bidAmount !== lastBid) {
      lastBid = bidAmount
    }

  } else if (!isActive && !isSettled) {
    hide($makeBidSection)
    hide($timeLeftSection)
    unhide($highestBidSection)
    unhide($settlementSection)
    unhide($activeBidSection)
    unhide($bidHistory)

    $highestBidLabel.innerHTML = 'Purchased For'

    $highestBidAmount.innerHTML = ethVal(highestBid.amount) + ' ETH'
    $highestBidder.innerHTML = `<a href="https://${await etherscanPrefix()}etherscan.io/address/${highestBid.bidder}" target="_blank" class="address">${await provider.formatAddr(highestBid.bidder, false)}</a>`


  } else if (!isActive && isSettled) {
    hide($makeBidSection)
    hide($timeLeftSection)
    hide($settlementSection)
    unhide($highestBidSection)
    unhide($activeBidSection)
    unhide($bidHistory)

    $highestBidLabel.innerHTML = 'Purchased For'
    $highestBidAmount.innerHTML = ethVal(highestBid.amount) + ' ETH'
    $highestBidder.innerHTML = `<a href="https://${await etherscanPrefix()}etherscan.io/address/${highestBid.bidder}" target="_blank" class="address">${await provider.formatAddr(highestBid.bidder, false)}</a>`

  }
  setMinBid = true


  const formatTime = (amt, measurement) => Math.round(amt*100)/100 + ' ' + (amt === 1 ? measurement : measurement + 's')
  const formatDuration = duration =>
    duration < 60 ? formatTime(duration, 'second') :
    duration < 3600 ? formatTime(duration / 60, 'minute') :
    duration <= 86400 ? formatTime(duration / 3600, 'hour') :
    formatTime(duration / 86400, 'day')


  const auctionLength = formatDuration(auction.duration)
  const reservePrice = ethVal(auction.minBid)
  const bidExtension = formatDuration(bnToN(auction.bidTimeExtension))
  const bidIncrease = bnToN(auction.bidIncreaseBps) / 100 + '%'

  const reserveDisplay = bnToN(auction.minBid) < 10000 ? `${bnToN(auction.minBid)} wei` : `${ethVal(auction.minBid)} ETH`

  $answerContent.innerHTML = `
    <ul>
      <li>This auction has ${reservePrice ? `a reserve price of ${reserveDisplay}` : 'no reserve price'}.</li>
      <li>Once the first bid is made, the auction will last ${auctionLength}.</li>
      <li>All bids made in the final ${bidExtension} will extend the auction.</li>
      <li>All bids must be ${bidIncrease} higher than the previous bid.</li>
      <li>Bids cannot be withdrawn once they are made.</li>
      <li>All bids must be made in ETH.</li>
    </ul>
  `


  if (auction.allowListContract !== ZERO_ADDR) {

    // if (bnToN(await KYC.balanceOf(signerAddr)) === 0) {
    //   $bidderSecondaryInfo.innerHTML = 'You must submit to ETF KYC requirements to bid'
    //   $submitBid.disabled = true
    // } else {
      $submitBid.disabled = false
      if (auction.rewardContract !== ZERO_ADDR) {
        const $wantsReward = $.id('wantsReward')
        const checked = !$wantsReward || $wantsReward.checked
        $bidderSecondaryInfo.innerHTML = `
          <label>
            Recieve 1 FastCash on bid: <input id="wantsReward" type="checkbox" ${checked ? 'checked' : ''}>
          </label>
        `

      } else {
        $bidderSecondaryInfo.innerHTML = ''
      }

    // }
  } else {
    $bidderSecondaryInfo.innerHTML = ''
    $submitBid.disabled = false
  }


  try {
    const unsortedBidsMade = await AUCTION.queryFilter(bidFilter).then(rawBids =>
      Promise.all(
        rawBids.map(
          async e => ({
            bidder: e.args.bidder,
            bidderDisplay: await provider.formatAddr(e.args.bidder, provider),
            amount: ethVal(e.args.amount),
            auctionId: bnToN(e.args.auctionId),
            timestamp: bnToN(e.args.timestamp),
          })
        )
      )
    )

    const bidsMade = unsortedBidsMade.sort((a,b) => b.timestamp - a.timestamp)
    if (bidsMade.length) {
      const ePrefix = await etherscanPrefix()
      $previousBidList.innerHTML = bidsMade.map(bid => {
        const bidAmount = Number(bid.amount.toFixed(14))
        const bidAmountPretty = String(bidAmount).includes('.') ? bidAmount : bidAmount.toFixed(1)
        return `
          <li class="bidHistoryItem">
            <div class="bidHistoryRow">
              <div>BID: ${bidAmountPretty} ETH</div>
              <div>
                <a href="https://${ePrefix}etherscan.io/address/${bid.bidder}" target="_blank" class="address">${bid.bidderDisplay}</a>
              </div>
            </div>
            <div>${new Date(bid.timestamp * 1000)}</div>
          </li>
        `
      }).join('')
    }
  } catch (e) {
    console.error(e)
  }

}



async function displayAPStats(etf) {
  $.id('apStats').innerHTML = `
    <section style=" display: flex; justify-content: space-between; width: 280px">
      <div>
        <h3 class="label">Shares Created</h3>
        <div style="font-family: monospace" id="sharesCreated">${fromWei(await etf.created(AP_ID)).toFixed(2)}</div>
      </div>
      <div>
        <h3 class="label">Shares Redeemed</h3>
        <div style="font-family: monospace" id="sharesRedeemed">${fromWei(await etf.redeemed(AP_ID)).toFixed(2)}</div>
      </div>
    </section>
  `
}

async function displayAPActions(etf) {
  $.id('activeBidSection').style.marginBottom = 0
  $.id('highestBidSection').style.marginBottom = 0

  let sharesOwned = ethers.utils.formatEther(await etf.balanceOf(await provider.signer.getAddress()))
  $.id('apActions').innerHTML = `
    <section style="border: 3px solid; padding: 1em">
      <div style="margin-bottom: 2em;">
        <h3 class="label">Shares Owned</h3>
        <div style="font-family: monospace" id="sharesOwned">${sharesOwned}</div>
      </div>
      <div>
        <h3>Create ETF</h3>
        <input id="createETF" class="shareCreationRedemption" placeholder="Shares" type="number"><button id="createETFSubmit" style="font-size:1em">Submit</button>
        <div id="creationPreview" style="height: 1em; padding:0.5em; margin-bottom:0.5em"></div>
      </div>

      <div>
        <h3>Redeem ETF</h3>
        <input id="redeemETF" class="shareCreationRedemption" placeholder="Shares" type="number"><button id="redeemETFSubmit" style="font-size:1em">Submit</button>
        <div id="redemptionPreview" style="height: 1em; padding:0.5em; margin-bottom:0.5em"></div>
      </div>

      <a href="https://etherscan.io/address/${ETF.address}" target="_blank" rel="nofollow" style="color: var(--accent-color)">View ETF contract on etherscan</a>
    </section>
  `

  const $creationPreview = $.id('creationPreview')
  const $redemptionPreview = $.id('redemptionPreview')
  const $createETF = $.id('createETF')
  const $redeemETF = $.id('redeemETF')
  const $createETFSubmit = $.id('createETFSubmit')
  const $redeemETFSubmit = $.id('redeemETFSubmit')


  $createETF.onkeyup = (e) => {
    $creationPreview.innerHTML = `(${e.target.value / 10000} ETH)`
  }
  $redeemETF.onkeyup = (e) => {
    if (e.target.value > sharesOwned) {
      $redemptionPreview.innerHTML = `<span style="color: red">You do not own this many shares</span>`
    } else {
      $redemptionPreview.innerHTML = ``
    }

  }


  $createETFSubmit.onclick = async () => {
    try {

      const tx = await ETF.create(AP_ID, await provider.signer.getAddress(), ethValue($createETF.value/10000))

      $creationPreview.innerHTML = `TX Pending. <a href="https://${await etherscanPrefix()}etherscan.io/tx/${tx.hash}" target="_blank" rel="nofollow" style="color: var(--accent-color)">View on etherscan</a>`

      const txReciept1 = await tx.wait(1)

      $creationPreview.innerHTML = 'Success!'
      $.id('sharesCreated').innerHTML = fromWei(await etf.created(AP_ID)).toFixed(2)
      sharesOwned = fromWei(await etf.balanceOf(await provider.signer.getAddress()))
      $.id('sharesOwned').innerHTML = sharesOwned.toFixed(2)
      $createETF.value = ''

    } catch (e) {
      $creationPreview.innerHTML = e?.data?.message || e?.error?.message || e?.message || 'Something went wrong'

      console.error(e)
    }
  }

  $redeemETFSubmit.onclick = async () => {
    try {
      const tx = await ETF.redeem(AP_ID, await provider.signer.getAddress(), toETH($redeemETF.value))

      $redemptionPreview.innerHTML = `TX Pending. <a href="https://${await etherscanPrefix()}etherscan.io/tx/${tx.hash}" target="_blank" rel="nofollow" style="color: var(--accent-color)">View on etherscan</a>`

      const txReciept1 = await tx.wait(1)

      $redemptionPreview.innerHTML = 'Success!'
      $.id('sharesRedeemed').innerHTML = fromWei(await etf.redeemed(AP_ID)).toFixed(2)
      sharesOwned = fromWei(await etf.balanceOf(await provider.signer.getAddress()))
      $.id('sharesOwned').innerHTML = sharesOwned.toFixed(2)
      $redeemETF.value = ''

    } catch (e) {
      $redemptionPreview.innerHTML = e?.data?.message || e?.error?.message || e?.message || 'Something went wrong'
      console.error(e)
    }
  }
}



async function displayTLStats(etf) {

  let holidays = []

  try {
    const daysElapsed = bnToN(await etf.daysElapsed())
    const holidayFilter = etf.filters.DeclareMarketHoliday(await etf.yearsElapsed())
    holidays = await etf.queryFilter(holidayFilter).then(h => h.map(h => bnToN(h.args.day)).filter(d => d >= daysElapsed).sort())



  } catch (e) {
    console.log(e)
  }

  const yearsElapsed = bnToN(await etf.yearsElapsed())
  const marketHolidaysDeclared = bnToN(await etf.yearToMarketHolidaysDeclared(yearsElapsed))

  $.id('apStats').innerHTML = `
    <section style=" display: flex; justify-content: space-between; flex-direction: column">
      <div style="margin-bottom: 0.5em">
        <h3 class="label">Is DST?</h3>
        <div id="isDST" style="font-family: monospace">${await etf.isDST()}</div>
      </div>
      <div style="margin-bottom: 0.5em">
        <h3 class="label">Market Holidays Declared (Year ${yearsElapsed})</h3>
        <div style="font-family: monospace" id="sharesRedeemed">${marketHolidaysDeclared}</div>
      </div>
      <div style="margin-bottom: 0.5em">
        <h3 class="label">Days Elapsed</h3>
        <div style="font-family: monospace">${daysElapsed}</div>
      </div>
      <div style="margin-bottom: 0.5em">
        <h3 class="label">Upcoming Holidays</h3>
        <div style="font-family: monospace">${
          holidays.length
            ? holidays.map(day => `<div style="font-family: monospace">Day ${day}</div>`).join('')
            : 'None'
        }</div>
      </div>
    </section>
  `
}

async function displayTLActions(etf) {
  $.id('activeBidSection').style.marginBottom = 0
  $.id('highestBidSection').style.marginBottom = 0

  $.id('apActions').innerHTML = `
    <section style="border: 3px solid; padding: 1em">
      <div>
        <h3>Declare DST</h3>
        <input id="declareDST" class="shareCreationRedemption" type="checkbox" style="cursor: pointer"><button id="declareDSTSubmit" style="font-size:1em">Submit</button>
        <div id="dstLoading" style="height: 1em; padding:0.5em; margin-bottom:0.5em"></div>
      </div>

      <div>
        <h3>Declare Market Holiday</h3>
        <input id="declareMarketHoliday" class="shareCreationRedemption" placeholder="Day" type="number"><button id="declareMarketHolidaySubmit" style="font-size:1em">Submit</button>
        <div id="marketHolidayLoading" style="height: 1em; padding:0.5em; margin-bottom:0.5em"></div>
      </div>

      <a href="https://etherscan.io/address/${ETF.address}" target="_blank" rel="nofollow" style="color: var(--accent-color)">View ETF contract on etherscan</a>
    </section>
  `

  $.id('declareDST').checked = await etf.isDST()

  $.id('declareDSTSubmit').onclick = async () => {
    try {
      const tx = await etf.declareDST($.id('declareDST').checked)

      $.id('dstLoading').innerHTML = `TX Pending. <a href="https://${await etherscanPrefix()}etherscan.io/tx/${tx.hash}" target="_blank" rel="nofollow" style="color: var(--accent-color)">View on etherscan</a>`

      const txReciept1 = await tx.wait(1)

      $.id('dstLoading').innerHTML = 'Success!'
      $.id('isDST').innerHTML = $.id('declareDST').checked

    } catch (e) {
      $.id('dstLoading').innerHTML = e?.data?.message || e?.error?.message || e?.message || 'Something went wrong'
      console.error(e)
    }
  }

  $.id('declareMarketHolidaySubmit').onclick = async () => {
    const proposedHoliday = Number($.id('declareMarketHoliday').value)

    const daysElapsed = bnToN(await etf.daysElapsed())
    const yearsElapsed = bnToN(await etf.yearsElapsed())
    const marketHolidaysDeclared = bnToN(await etf.yearToMarketHolidaysDeclared(yearsElapsed))

    const daysLeftInYear = 365 - (daysElapsed % 365)


    if (marketHolidaysDeclared == 10) {
      $.id('marketHolidayLoading').innerHTML = '10 Market Holidays have already been declared for the year'
      return
    }

    if (proposedHoliday < daysElapsed) {
      $.id('marketHolidayLoading').innerHTML = 'Can only declare Market Holidays in the future'
      return
    }

    if (proposedHoliday > daysElapsed + daysLeftInYear) {
      $.id('marketHolidayLoading').innerHTML = 'Can only declare Market Holidays within the fiscal year'
      return
    }

    $.id('marketHolidayLoading').innerHTML = ''


    const $marketHolidayLoading = $.id('marketHolidayLoading')
    try {
      const tx = await etf.declareMarketHoliday(proposedHoliday)

      $marketHolidayLoading.innerHTML = `TX Pending. <a href="https://etherscan.io/tx/${tx.hash}" target="_blank" rel="nofollow" style="color: var(--accent-color)">View on etherscan</a>`

      const txReciept1 = await tx.wait(1)

      $marketHolidayLoading.innerHTML = 'Success!'
      await displayTLStats(etf)
      $.id('declareMarketHoliday').value = ''

    } catch (e) {
      if (e.data) {
        $marketHolidayLoading.innerHTML = e.data.message
      } else {
        $marketHolidayLoading.innerHTML = e.message
      }
      console.error(e)
    }
  }
}







provider.onConnect(async (signer) => {
  const { ETF, AP, AUCTION } = await provider.getContracts()

  setRunInterval(() => updateBidInfo(provider.signer, AUCTION, AP), 3000)


  $submitBid.onclick = async () => {
    hide($bidSectionContent)
    hide($biddingHelp)
    unhide($bidSectionLoading)
    $bidSectionError.innerHTML = ''
    $bidSectionLoadingMessage.innerHTML = 'Submitting...'

    try {
      const [highestBid, auction] = await Promise.all([
        AUCTION.auctionIdToHighestBid(AUCTION_ID),
        AUCTION.auctionIdToAuction(AUCTION_ID),
      ])

      const minBid = highestBid.amount
        ? ethVal(highestBid.amount) * (1 + auction.bidIncreaseBps/10000)
        : ethVal(auction.minBid)

      if ($newBidAmount.value < minBid) {
        throw new Error(`Bid must be at least ${minBid} ETH`)
      }

      const $wantsReward = $.id('wantsReward')
      const wantsReward = $wantsReward && $wantsReward.checked
      const tx = await AUCTION.bid(AUCTION_ID, wantsReward, ethValue($newBidAmount.value))

      $bidSectionLoadingMessage.innerHTML = `TX Pending. <a href="https://${await etherscanPrefix()}etherscan.io/tx/${tx.hash}" target="_blank" style="color:var(--accent-color)">View on etherscan</a>`

      const txReciept1 = await tx.wait(1)

      setMinBid = false
      updateBidInfo(provider.signer, AUCTION, AP)

      const auctionsBidOn = ls.get('__AUCTIONS_BID_ON__') || {}
      auctionsBidOn[AUCTION_ID] = true
      ls.set('__AUCTIONS_BID_ON__', JSON.stringify(auctionsBidOn))

      unhide($bidSectionContent)
      unhide($biddingHelp)
      hide($bidSectionLoading)

    } catch (e) {
      unhide($bidSectionContent)
      hide($bidSectionLoading)
      if (e.data) {
        $bidSectionError.innerHTML = e.data.message
      } else {
        $bidSectionError.innerHTML = e.message
      }
      console.error(e)
    }
  }


  $submitSettlement.onclick = async () => {
    hide($settlementSectionContent)
    unhide($settlementSectionLoading)
    $settlementSectionError.innerHTML = ''
    $settlementSectionLoadingMessage.innerHTML = 'Submitting...'

    try {
      const tx = await AUCTION.settle(AUCTION_ID)

      $settlementSectionLoadingMessage.innerHTML = `TX Pending. <a href="https://${await etherscanPrefix()}etherscan.io/tx/${tx.hash}" target="_blank">View on etherscan</a>`

      const txReciept1 = await tx.wait(1)

      updateBidInfo(provider.signer, AUCTION, AP)

      unhide($settlementSectionContent)
      hide($settlementSectionLoading)

    } catch (e) {
      unhide($settlementSectionContent)
      hide($settlementSectionLoading)
      if (e.data) {
        $settlementSectionError.innerHTML = e.data.message
      } else {
        $settlementSectionError.innerHTML = e.message
      }
      console.error(e)
    }
  }




  if ((await AP.ownerOf(AP_ID)) !== AUCTION.address) {

    hide($makeBidSection)
    hide(($.id('dataLastUpdated')))

    if (AP_ID === 0) displayTLStats(ETF)
    else displayAPStats(ETF)

    if (await AP.ownerOf(AP_ID) === signer) {
      if (AP_ID === 0) displayTLActions(ETF)
      else displayAPActions(ETF)
    }
  }
})


let showingAnswer = false
$question.onclick = () => {
  showingAnswer = true
  hide($question)
  unhide($answer)
}

$answerX.onclick = () => {
  showingAnswer = false
  unhide($question)
  hide($answer)
}





function formatMinBid(amt) {
  return Math.ceil(amt * 1000) / 1000
}



function unhide(element) {
  $(element, 'display', '')
}

function hide(element) {
  $(element, 'display', 'none')
}

function setRunInterval(fn, ms, i=0) {
  const run = () => {
    fn(i)
    i++
  }

  run()

  let isCleared = false

  let interval = setInterval(run, ms)

  const stopInterval = () => {
    if (!isCleared) {
      clearInterval(interval)
      isCleared = true
    }
  }
  return stopInterval
}

function triggerTimer(timeLeft, $elem) {
  const with0 = x => x < 10 ? '0' + Math.floor(x) : Math.floor(x)
  let timeLeftCounter = timeLeft
  return setRunInterval(() => {
    timeLeftCounter = Math.max(timeLeftCounter - 1000, 0)
    const days = timeLeftCounter / (24*60*60*1000)
    const hours = 24 * (days%1)
    const minutes = 60 * (hours%1)
    const seconds = Math.floor(60 * (minutes%1))
    const ms = Math.floor(timeLeftCounter % 1000 / 100) % 10

    if (timeLeft < 300000) $elem.innerHTML = `*Your web browser is <br>~${Math.abs(timeDiff/1000)} seconds ${timeDiff < 0 ? 'behind' : 'ahead of'} <br>the blockchain`


    $elem.innerHTML = `${Math.floor(days)}:${with0(hours)}:${with0(minutes)}:${with0(seconds)}`
  }, 1000)
}