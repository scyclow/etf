// SPDX-License-Identifier: MIT

import "./Dependencies.sol";
import "./AuthorizedParticipants.sol";

pragma solidity ^0.8.23;


contract ETF is ERC20 {
  uint256 public constant TOKENS_PER_ETH = 10000;
  uint256 public constant INCEPTION = 1712586600; // 4/8 10:30am EDT (9:30am EST, 14:30pm UTC)
  uint256 public constant MARKET_OPEN_DURATION = 6 hours + 30 minutes;

  bool public isDST;

  AuthorizedParticipants public authorizedParticipants;

  mapping(uint256 => uint256) public created;
  mapping(uint256 => uint256) public redeemed;
  mapping(uint256 => bool) public isMarketHoliday;
  mapping(uint256 => uint256) public yearToMarketHolidaysDeclared;

  event Creation(uint256 _tokenId, uint256 _amount);
  event Redemption(uint256 _tokenId, uint256 _amount);
  event DeclareDST(bool value);
  event DeclareMarketHoliday(uint256 indexed year, uint256 day);

  constructor() ERC20('ETF', 'ETF') {
    authorizedParticipants = new AuthorizedParticipants(msg.sender);
  }

  function nav() public view returns (uint256) {
    return (address(this).balance) / (totalSupply() / 1 ether);
  }


  //// Market Hours

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

  function _beforeTokenTransfer(address, address, uint256) internal virtual override {
    require(isMarketOpen(), 'Can only transfer during market trading hours');
  }


  //// Authorized Participant actions

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


  //// Time Lord actions

  function declareMarketHoliday(uint256 day) external {
    require(msg.sender == authorizedParticipants.ownerOf(0), 'Only the Time Lord can declare Market Holidays');
    require(yearToMarketHolidaysDeclared[yearsElapsed()] < 10, 'The Time Lord can only declare 10 Market Holidays per fiscal year');
    require(day >= daysElapsed() && day <= (daysElapsed() + 366), 'The Time Lord can only declare Market Holidays within the fiscal year');

    if (!isMarketHoliday[day]) {
      isMarketHoliday[day] = true;
      yearToMarketHolidaysDeclared[yearsElapsed()]++;
      authorizedParticipants.metadataUpdate(0);
      emit DeclareMarketHoliday(yearsElapsed(), day);
    }
  }

  function declareDST(bool dst) external {
    require(msg.sender == authorizedParticipants.ownerOf(0), 'Only the Time Lord can declare DST');
    isDST = dst;
    authorizedParticipants.metadataUpdate(0);

    emit DeclareDST(dst);
  }
}

