// SPDX-License-Identifier: MIT

import "./Dependencies.sol";
import "./ETF.sol";

pragma solidity ^0.8.23;

contract AuthorizedParticipants is ERC721, Ownable {
  uint256 public constant totalSupply = 7;

  ETF public etf;
  TokenURI public tokenURIContract;

  struct RevokeProposal {
    uint256 tokenId;
    address destination;
  }

  mapping(uint256 => RevokeProposal) public revokeProposals;

  event MetadataUpdate(uint256 _tokenId);
  event BatchMetadataUpdate(uint256 _fromTokenId, uint256 _toTokenId);

  constructor(address _owner) ERC721('ETF Authorized Participants', 'AP') {
    etf = ETF(msg.sender);
    transferOwnership(_owner);
    tokenURIContract = new TokenURI(msg.sender);

    for (uint i; i < totalSupply; i++) {
      _mint(_owner, i);
    }
  }


  function exists(uint256 tokenId) external view returns (bool) {
    return _exists(tokenId);
  }


  function metadataUpdate(uint256 tokenId) external {
    require(msg.sender == address(etf));
    emit MetadataUpdate(tokenId);
  }

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    return TokenURI(tokenURIContract).tokenURI(tokenId);
  }

  function setURIContract(address _uriContract) external onlyOwner {
    tokenURIContract = TokenURI(_uriContract);
    emit BatchMetadataUpdate(0, totalSupply);
  }




  function proposeRevoke(uint256 votingTokenId, uint256 revokedTokenId, address revokeDestination) external {
    require(votingTokenId != 0, 'Time Lord cannot revoke');
    require(revokedTokenId != 0, 'Cannot revoke the Time Lord');
    require(ownerOf(votingTokenId) == msg.sender, 'Not authorized to make revoke proposal');

    revokeProposals[votingTokenId].tokenId = revokedTokenId;
    revokeProposals[votingTokenId].destination = revokeDestination;
  }


  function revoke(uint256 revokedTokenId, address revokeDestination) external {
    uint revokeCount;

    for (uint i = 1; i < totalSupply; i++) {
      RevokeProposal storage rp = revokeProposals[i];
      if (
        rp.tokenId != 0
        && rp.tokenId == revokedTokenId
        && rp.destination == revokeDestination
      ) {
        revokeCount++;
        rp.tokenId = 0;
        rp.destination = address(0);
      }
    }

    require(revokeCount >= totalSupply - 2, 'Not enough votes to revoke AP token');
    _transfer(ownerOf(revokedTokenId), revokeDestination, revokedTokenId);
  }

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721) returns (bool) {
    return interfaceId == bytes4(0x49064906) || super.supportsInterface(interfaceId);
  }
}


contract TokenURI {
  using Strings for uint256;

  ETF public etf;
  AuthorizedParticipants public ap;

  string public externalUrl = "https://etf.steviep.xyz";


  constructor(address _etf) {
    etf = ETF(_etf);
    ap = AuthorizedParticipants(msg.sender);
  }

  function tokenURI(uint256 tokenId) public view returns (string memory) {
    bytes memory encodedSVG = abi.encodePacked(
      'data:image/svg+xml;base64,',
      Base64.encode(
        tokenId > 0 ? apSVG(tokenId) : timeLordSVG()
      )
    );

    string memory attrs = getAttrs(tokenId);

    string memory name = tokenId > 0
      ? string.concat('Authorized Participant ', tokenId.toString())
      : 'Time Lord';

    string memory description = getDescription(tokenId);

    bytes memory json = abi.encodePacked(
      'data:application/json;utf8,',
      '{"name": "', name, '",',
      '"description": "', description, '",',
      '"image": "', encodedSVG, '",',
      '"attributes": ', attrs,',',
      '"external_url": "', externalUrl, '"',
      '}'
    );
    return string(json);
  }

  function setURL(string memory url) external {
    require(msg.sender == ap.owner(), 'Only AP contract owner can set url');
    externalUrl = url;
  }

  function getDescription(uint256 tokenId) public pure returns (string memory) {
    string memory roleText = tokenId > 0
      ? 'Authorized Participants have the right (but not the obligation) to create and redeem shares of ETF.'
      : 'The Time Lord has the sole ability to declare Market Holidays and DST.';
    return string.concat(
      'ETF seeks to simulate the experience of owning shares of an exchange-traded fund that seeks to reflect, before fees and expenses, the performance of the price of Ethereum. ',
      roleText
    );
  }

  function getAttrs(uint256 tokenId) public view returns (string memory) {
    if (tokenId > 0) {
      uint256 tokensCreated = (etf.created(tokenId) / 1 ether);
      uint256 tokensRedeemed = (etf.redeemed(tokenId) / 1 ether);
      return string.concat(
        '[',
          '{"trait_type": "Shares Created", "value": "', tokensCreated.toString(), '"},',
          '{"trait_type": "Shares Redeemed", "value": "', tokensRedeemed.toString(), '"}',
        ']'
      );

    } else {
      return string.concat(
        '[',
          '{"trait_type": "Market Holidays Set For Year", "value": "', etf.yearToMarketHolidaysDeclared(etf.yearsElapsed()).toString(), '"},',
          '{"trait_type": "Is DST", "value": "', etf.isDST() ? 'True' : 'False', '"}',
        ']'
      );
    }
  }

  function timeLordSVG() public view returns (bytes memory) {
    string memory c1 = etf.isDST() ? '383a3c' : '0078bd';
    string memory c2 = etf.isDST() ? '0078bd' : '383a3c';

    return abi.encodePacked(
      '<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">'
        '<circle cx="250" cy="250" r="250" fill="#', c1, '"></circle>'
        '<circle cx="250" cy="250" r="230" fill="#', c2, '"></circle>'
        '<text x="250" y="270" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-size="250" font-family="sans-serif">TL</text>'
      '</svg>'
    );
  }

  function apSVG(uint256 tokenId) public pure returns (bytes memory) {
    uint256 i = tokenId - 1;

    string[2][6] memory params = [
      ['383a3c', 'fff'],
      ['383a3c', '0078bd'],
      ['0078bd', 'fff'],
      ['0078bd', '383a3c'],
      ['fff', '383a3c'],
      ['fff', '0078bd']
    ];

    return abi.encodePacked(
      '<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">'
        '<style>'
          'text{font-family:monospace;fill:#',params[i][0],';font-size:180px}'
          'rect{fill:#',params[i][1],';stroke:#',params[i][0],';stroke-width:35px}'
        '</style>'
        '<rect x="0" y="0" width="500" height="500"></rect>'
        '<text class="fillLight" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">AP',tokenId.toString(),'</text>'
      '</svg>'
    );
  }
}
