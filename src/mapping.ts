import { ipfs, json, JSONValue } from "@graphprotocol/graph-ts";
import {
  Contract as TokenContract,
  Transfer as TransferEvent
} from "../generated/Contract/Contract";

import {
  Token, User
} from '../generated/schema';

export function handleTransfer(event: TransferEvent): void {
  let baseHash = "QmdVmsBeGCiZU7UpszYP4mnL7q2pV6MozCwBZzr7kPy2AU";
  let fullIPFSURI = "ipfs.io/ipfs/" + baseHash + "/";
  var token = Token.load(event.params.tokenId.toString());
  if (!token) {
    token = new Token(event.params.tokenId.toString());
    token.creator = event.params.to.toHexString();
    token.tokenID = event.params.tokenId;
    token.createdAtTimestamp = event.block.timestamp;
  }
  token.updatedAtTimestamp = event.block.timestamp;
  let tokenContract = TokenContract.bind(event.address);

  let baseURI = tokenContract.baseTokenURI();
  let contentURI = tokenContract.tokenURI(event.params.tokenId);

  if (baseURI.includes('https')) {
    baseURI = fullIPFSURI;
  } else if (baseURI.includes('ipfs')) {
    let hash = baseURI.split('ipfs://').join('');
    baseURI = "ipfs.io/ipfs" + hash;
  }

  if (contentURI.includes('https')) {
    contentURI = fullIPFSURI + event.params.tokenId.toString();
  } else {
    let hash = contentURI.split('ipfs://').join('');
    contentURI = "ipfs.io/ipfs/" + hash + event.params.tokenId.toString();
  }

  token.contentURI = contentURI;
  token.baseURI = baseURI;

  if (contentURI != "") {
    let hash = contentURI.split('ipfs.io/ipfs/').join('');
    let data = ipfs.cat(hash);

    if (!data) return;
    let value = json.fromBytes(data).toObject();
    if (data) {
      var image = value.get('image');
      if (image) {
        let h = image.toString();
        let imageHash = h.split('ipfs://').join('');
        token.imageURI = 'ipfs.io/ipfs/' + imageHash;
      }

      let attributes: JSONValue[] = [];
      let atts = value.get('attributes');
      if (atts) {
        attributes = atts.toArray();
      }

      for (let i = 0; i < attributes.length; i++) {
        let item = attributes[i].toObject();
        let trait: string = "";
        let t = item.get('trait_type');
        if (t) {
          trait = t.toString();
        }
        let value: string = "";
        let v = item.get('value');
        if (v) {
          value = v.toString();
        }
        if (trait == "Generation") {
          token.generation = value;
        }

        if (trait == "Membership") {
          token.membership = value;
        }

        if (trait == "Member Number") {
          token.memberNumber = value;
        }
      }
    }
  }

  token.owner = event.params.to.toHexString();
  token.save();

  let user = User.load(event.params.to.toHexString());
  if (!user) {
    user = new User(event.params.to.toHexString());
    user.save();
  }
}
