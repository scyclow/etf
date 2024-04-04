// SPDX-License-Identifier: MIT

import "./Dependencies.sol";
import "./AuthorizedParticipants.sol";

pragma solidity ^0.8.23;

/*
$ETF is not an exchange-traded product, nor is it another any other form of 1940 act mutual fund.



TODO
  - expense ratio once per Q




  - KYC
    - costs 0.01
      - first name
      - last name
      - SSN
    - id: address
    - can buy up to 1 ETH


  - deposit AP0 into SALE (S___ A____ Liquidity Event) contract
    - any KYC holder can use AP0 for one market day


  - wait one week until AP auction
  OR
  - same day AP auction



  - Expense Ratio
    - 0.03

    1.000000 eth
    0.0003
    - note that this is well below the industry standard



  - allow voting
    - 5/6 -> revoke 6th AP
    - each AP must chose 2 market holidays every 365 days
      - cannot choose overlapping days
      - max of 10 market holidays


*/


contract ETF is ERC20 {
  uint256 public constant TOKENS_PER_ETH = 10000;
  uint256 public constant INCEPTION = 1704724200; // TODO - change this to 4/8 9:30am EDT/ 8:30am EST
  uint256 public constant MARKET_OPEN_DURATION = 6 hours + 30 minutes;

  bool public isDST; // TODO change this to true

  AuthorizedParticipants public authorizedParticipants;

  mapping(uint256 => uint256) public created;
  mapping(uint256 => uint256) public redeemed;
  mapping(uint256 => bool) public isMarketHoliday;
  mapping(uint256 => uint256) public yearToMarketHolidaysSet;

  event Creation(uint256 _tokenId, uint256 _amount);
  event Redemption(uint256 _tokenId, uint256 _amount);

  constructor() ERC20('ETF', 'ETF') {
    authorizedParticipants = new AuthorizedParticipants(msg.sender);
  }

  function nav() public view returns (uint256) {
    return (address(this).balance) / (totalSupply() / 1 ether);
  }

  function yearsElapsed() public view returns (uint256) {
    return (block.timestamp - INCEPTION) / 365 days;
  }

  function daysElapsed() public view returns (uint256) {
    uint256 dstAdjustment = isDST ? 1 hours : 0;
    uint256 timeElapsed = (block.timestamp - INCEPTION) + dstAdjustment;
    return timeElapsed / 1 days;
  }

  function isMarketOpen() public view returns (bool) {
    uint256 dstAdjustment = isDST ? 1 hours : 0;
    uint256 timeElapsed = (block.timestamp - INCEPTION) + dstAdjustment;
    uint256 marketTime = timeElapsed % 1 days;
    uint256 _daysElapsed = timeElapsed / 1 days;
    uint8 dayOfWeek = uint8(_daysElapsed % 7);

    return (
      dayOfWeek < 5 && !isMarketHoliday[_daysElapsed] // Monday - Friday & not a market holiday
      && marketTime < MARKET_OPEN_DURATION // 9:30am - 4:00pm (EST or EDT, depending on DST)
    );
  }


  function create(uint256 tokenId, address recipient) external payable {
    require(msg.sender == authorizedParticipants.ownerOf(tokenId), 'Only Authorized Participants can create tokens');
    require(tokenId > 0, 'Time Lord cannot create tokens');
    uint256 amountToCreate = msg.value * TOKENS_PER_ETH;
    _mint(recipient, amountToCreate);

    created[tokenId] += amountToCreate;
    authorizedParticipants.metadataUpdate(tokenId);
    emit Creation(tokenId, amountToCreate);
  }

  function redeem(uint256 tokenId, address recipient, uint256 redeemAmount) external {
    require(msg.sender == authorizedParticipants.ownerOf(tokenId), 'Only Authorized Participants can redeem tokens');
    require(tokenId > 0, 'Time Lord cannot redeem tokens');
    _burn(msg.sender, redeemAmount);
    bool sent = payable(recipient).send(redeemAmount / TOKENS_PER_ETH);
    require(sent);

    redeemed[tokenId] += redeemAmount;
    authorizedParticipants.metadataUpdate(tokenId);
    emit Redemption(tokenId, redeemAmount);
  }

  function _beforeTokenTransfer(address, address, uint256) internal virtual override {
    require(isMarketOpen(), 'Can only transfer during market trading hours');
  }


  function declareMarketHoliday(uint256 day) external {
    require(msg.sender == authorizedParticipants.ownerOf(0), 'Only the Time Lord can declare Market Holidays');
    require(yearToMarketHolidaysSet[yearsElapsed()] < 10, 'The Time Lord can only declare 10 Market Holidays per fiscal year');
    require(day >= daysElapsed() && day <= (daysElapsed() + 365), 'The Time Lord can only declare Market Holidays within the fiscal year');

    if (!isMarketHoliday[day]) {
      isMarketHoliday[day] = true;
      yearToMarketHolidaysSet[yearsElapsed()]++;
      authorizedParticipants.metadataUpdate(0);
    }
  }

  function declareDST(bool dst) external {
    require(msg.sender == authorizedParticipants.ownerOf(0), 'Only the Time Lord can declare DST');
    isDST = dst;
    authorizedParticipants.metadataUpdate(0);
  }
}

