// // SPDX-License-Identifier: MIT

// /*

//   TODO: ability to LP your token AND your NAV; you get 90% of your LP fees


//   by steviep.eth

// */

// import "./Dependencies.sol";

// pragma solidity ^0.8.23;


// contract CEF is ERC20 {

//   uint256 public constant INITIAL_PRICE = 1000000000000; // ~$0.0035
//   uint256 public constant START_TIMESTAMP = 1679325600; // MARCH 29 2024 9AM EST
//   uint256 public constant MARKET_OPEN_DURATION = 7 hours + 30 minutes;
//   uint256 public totalStakedNAV;

//   mapping(uint256 => uint256) dayToSecondaryOfferingAmount;
//   mapping(uint256 => uint256) dayStartingNAV;
//   mapping(uint256 => uint256) dayAmountRaised;


//   constructor() ERC20('CoordinatedEnergyF...', 'ETF') {

//   }

//   function nav() public view returns (uint256) {
//     return (address(this).balance + totalStakedNAV) / (totalSupply() / 1 ether);
//   }

//   function timeElapsed() public view returns (uint256) {
//     return block.timestamp - START_TIMESTAMP; // MARCH 29 2024 9AM EST
//   }

//   function dayAndTime() public view returns (uint8 dayOfWeek, uint256 marketTime) {
//     uint256 _timeElapsed = timeElapsed();
//     uint256 daysElapsed = _timeElapsed / 1 days;
//     uint8 dayOfWeek = uint8((daysElapsed + 2) % 7);
//     uint256 marketTime = _timeElapsed % 1 days;
//   }


//   function marketIsOpen() public view returns (bool) {
//     // is it m,t,w,th,f between 9:00am - 4:30pm
//     (uint8 dayOfWeek, uint256 marketTime) = dayAndTime();
//     bool isMarketDay = weekDay > 0 && weekDay < 6; // monday - friday
//     bool isMarketOpen = marketTime < MARKET_OPEN_DURATION;

//     return isMarketDay && isMarketOpen;
//   }

//   modifier onlyMarketOpen() {
//       require(marketIsOpen(), "Can only transact during market hours");
//       _;
//   }

//   receive() external payable {
//     require(timeElapsed() <= MARKET_OPEN_DURATION, "Can only purchase tokens on day 0");

//     uint256 tokensToIssue = 1 ether * (msg.value / INITIAL_PRICE);

//     _mint(msg.sender, tokensToIssue);
//   }

//   function tender(uint256 tokensToTender) external onlyMarketOpen {
//     require(balanceOf(msg.sender) <= amount, 'Tender amount exceeds balance');

//     uint256 amountToLiquidate = nav() * tokensToTender;

//     _burn(msg.sender, tokensToIssue);
//     bool sent = msg.sender.send(amountToLiquidate);
//     require(sent, "Failed to send Ether");
//   }

//   function newTokenAmount(uint256 valueIn) public view returns (uint256) {
//     uint256 navsIn = valueIn / nav();
//     uint256 bpGrowth = (navsIn * (totalSupply()/1 ether)) / 10000;
//     return (Math.sqrt(bpGrowth) - (navsIn/4)) * 1 ether;

//   }

//   function secondaryOffering() external payable onlyMarketOpen {
//     uint256 daysElapsed = timeElapsed() / 1 days;

//     uint256 currentSecondaryOffering = dayToSecondaryOfferingAmount[daysElapsed];

//     if (dayStartingNAV[daysElapsed] == 0) {
//       dayStartingNAV[daysElapsed] = nav();
//     }

//     uint256 tokens = newTokenAmount(msg.value + dayAmountRaised[daysElapsed]) - newTokenAmount(dayAmountRaised[daysElapsed]);

//     dayAmountRaised[daysElapsed] += msg.value;
//     _mint(msg.sender, tokensToIssue);
//   }


// /*
//   function stakeNAV(uint256 amountTokenDesired) external {
//     uint256 ownerNAVShare = balanceOf(msg.sender) * nav();
//     // _approve uniswap for amountTokenDesired

//     // totalStakedNAV += ownerNAVShare

//     UniRouter.addLiquidityETH{value: ownerNAVShare}(
//       address(this),
//       amountTokenDesired,
//       // amountTokenMin
//       // amountETHMin,
//       address(this),
//       // deadline
//     );

//     //
//   }

//   function unstakeNAV(uint256 liquidity) external {

//     // UniRouter.removeLiquidityETH(
//     //   address(this),
//     //   liquidity,
//     //   // amountTokenMin,
//     //   // amountETHMin,
//     //   address(this),
//     //   // deadline
//     )
//     // totalStakedNAV -= ownerNAVShare
//     // send shares back to owner
//     // handle profit

//   }
// */
// }

