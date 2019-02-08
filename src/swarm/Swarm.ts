import { keccak256 } from 'js-sha3';
import { ec } from 'elliptic';

import { PublicIdentity, PrivateIdentity } from '../models/Identity';
import { Debug } from '../Debug';
import { safeFetch, safeFetchWithTimeout } from '../Network';
import { hexToByteArray, byteArrayToHex, stringToByteArray } from '../conversion';
import { Buffer } from 'buffer';

export const DefaultGateway = 'http://localhost:8500';
export const DefaultUrlScheme = '/bzz-raw:/';
export const DefaultPrefix = 'bzz://';
export const DefaultFeedPrefix = 'bzz-feed:/';
export const HashLength = 64;

const upload = async (data: string, swarmGateway: string = DefaultGateway): Promise<string> => {
    Debug.log('upload: to Swarm: ', data);
    try {
        const hash = await uploadData(data, swarmGateway);
        Debug.log('upload:', 'hash is', hash);
        return hash;
    } catch (e) {
        Debug.log('upload:', 'failed', JSON.stringify(e));
        return '';
    }
};

export const getUrlFromHash = (hash: string): string => {
    return DefaultGateway + DefaultUrlScheme + hash;
};

const uploadForm = async (data: FormData, swarmGateway: string = DefaultGateway): Promise<string> => {
    Debug.log('uploadForm: ', data);
    const url = swarmGateway + '/bzz:/';
    const options: RequestInit = {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
        method: 'POST',
    };
    options.body = data;
    Debug.log('uploadForm: ', url, options);
    const response = await safeFetch(url, options);
    const text = await response.text();
    Debug.log('uploadForm: response: ', text);
    return text;
};

export const isSwarmLink = (link: string): boolean => {
    return link.startsWith(DefaultPrefix);
};

export const getSwarmGatewayUrl = (swarmUrl: string): string => {
    if (isSwarmLink(swarmUrl)) {
        return DefaultGateway + DefaultUrlScheme + swarmUrl.slice(DefaultPrefix.length);
    }
    if (swarmUrl.length === HashLength) {
        return DefaultGateway + DefaultUrlScheme + swarmUrl;
    }
    return swarmUrl;
};

export const calculateTopic = (topic: string): string => {
    const prefixedTopic = `felfele:${topic}`;
    return '0x' + keccak256.hex(prefixedTopic);
};

const imageMimeTypeFromPath = (path: string): string => {
    if (path.endsWith('jpg')) {
        return 'jpeg';
    }
    if (path.endsWith('jpeg')) {
        return 'jpeg';
    }
    if (path.endsWith('png')) {
        return 'png';
    }
    return 'unknown';
};

const uploadPhoto = async (localPath: string, swarmGateway: string = DefaultGateway): Promise<string> => {
    Debug.log('uploadPhoto: ', localPath);
    const data = new FormData();
    const imageMimeType = imageMimeTypeFromPath(localPath);
    const name = 'photo.' + imageMimeType;
    data.append('photo', {
        uri: localPath,
        type: 'image/' + imageMimeType,
        name,
    } as any as Blob);
    data.append('title', 'photo');

    const hash = await uploadForm(data, swarmGateway);
    return DefaultPrefix + hash + '/' + name;
};

const uploadData = async (data: string, swarmGateway: string = DefaultGateway): Promise<string> => {
    Debug.log('uploadData: ', data);
    const url = swarmGateway + '/bzz:/';
    const options: RequestInit = {
        headers: {
            'Content-Type': 'text/plain',
        },
        method: 'POST',
    };
    options.body = data;
    const response = await safeFetch(url, options);
    const text = await response.text();
    return text;
};

const downloadData = async (hash: string, timeout: number = 0, swarmGateway: string = DefaultGateway): Promise<string> => {
    const url = swarmGateway + '/bzz:/' + hash + '/';
    Debug.log('downloadData:', url);
    const response = await safeFetchWithTimeout(url, undefined, timeout);
    const text = await response.text();
    return text;
};

export const DefaultEpoch = {
    time: 0,
    level: 0,
};

export interface Epoch {
    time: number;
    level: number;
}

export interface FeedAddress {
    topic: string;
    user: string;
}

interface FeedTemplate {
    feed: FeedAddress;
    epoch: Epoch;
    protocolVersion: number;
}

const calculateFeedAddressQueryString = (address: FeedAddress): string => {
    return `user=${address.user}` + (address.topic === '' ? '' : `&topic=${address.topic}`);
};

const downloadUserFeedTemplate = async (swarmGateway: string, address: FeedAddress): Promise<FeedTemplate> => {
    const addressPart = calculateFeedAddressQueryString(address);
    const response = await downloadFeed(swarmGateway, `bzz-feed:/?${addressPart}&meta=1`);
    const feedUpdateResponse = JSON.parse(response) as FeedTemplate;
    Debug.log('downloadUserFeedTemplate: ', feedUpdateResponse);
    return feedUpdateResponse;
};

const downloadUserFeed = async (swarmGateway: string, address: FeedAddress): Promise<string> => {
    const addressPart = calculateFeedAddressQueryString(address);
    return await downloadFeed(swarmGateway, `bzz-feed:/?${addressPart}`);
};

const downloadUserFeedPreviousVersion = async (swarmGateyay: string, address: FeedAddress, epoch: Epoch): Promise<string> => {
    const addressPart = calculateFeedAddressQueryString(address);
    return await downloadFeed(swarmGateyay, `bzz-feed:/?${addressPart}&time=${epoch.time}`);
};

const downloadFeed = async (swarmGateway: string, feedUri: string, timeout: number = 0): Promise<string> => {
    const url = swarmGateway + '/' + feedUri;
    Debug.log('downloadFeed: ', url);
    const response = await safeFetchWithTimeout(url, undefined, timeout);
    const text = await response.text();
    return text;
};

const updateUserFeedWithSignFunction = async (swarmGateway: string, feedTemplate: FeedTemplate, signFeedDigest: FeedDigestSigner, data: string): Promise<FeedTemplate> => {
    const digest = feedUpdateDigest(feedTemplate, data);
    if (digest == null) {
        throw new Error('digest is null');
    }
    const addressPart = calculateFeedAddressQueryString(feedTemplate.feed);
    const signature = await signFeedDigest(digest);
    const url = swarmGateway + `/bzz-feed:/?${addressPart}&level=${feedTemplate.epoch.level}&time=${feedTemplate.epoch.time}&signature=${signature}`;
    Debug.log('updateFeed: ', url, data);
    const options: RequestInit = {
        method: 'POST',
        body: data,
    };
    const response = await safeFetch(url, options);
    const text = await response.text();
    Debug.log('updateFeed: ', text);

    return feedTemplate;
};

export interface ReadableFeedApi {
    download: () => Promise<string>;
    downloadPreviousVersion: (epoch: Epoch) => Promise<string>;
    downloadFeedTemplate: () => Promise<FeedTemplate>;
    downloadFeed: (feedUri: string, timeout: number) => Promise<string>;
    getUri: () => string;

    readonly address: FeedAddress;
}

export const makeFeedAddressFromBzzFeedUrl = (bzzFeedUrl: string): FeedAddress => {
    if (bzzFeedUrl.startsWith('bzz-feed:/?user=')) {
        return {
            topic: '',
            user: bzzFeedUrl.replace('bzz-feed:/?user=', ''),
        };
    }
    return {
        topic: '',
        user: '',
    };
};

export const makeFeedAddressFromPublicIdentity = (publicIdentity: PublicIdentity): FeedAddress => {
    return {
        topic: '',
        user: publicIdentity.address,
    };
};

export const makeReadableFeedApi = (address: FeedAddress, swarmGateway: string = DefaultGateway): ReadableFeedApi => ({
    download: async (): Promise<string> => downloadUserFeed(swarmGateway, address),
    downloadPreviousVersion: async (epoch: Epoch) => downloadUserFeedPreviousVersion(swarmGateway, address, epoch),
    downloadFeedTemplate: async () => downloadUserFeedTemplate(swarmGateway, address),
    downloadFeed: async (feedUri: string, timeout: number = 0) => await downloadFeed(swarmGateway, feedUri, timeout),
    getUri: () => `bzz-feed:/?${calculateFeedAddressQueryString(address)}`,
    address,
});

type FeedDigestSigner = (digest: number[]) => string | Promise<string>;

export interface WriteableFeedApi extends ReadableFeedApi {
    updateWithFeedTemplate: (feedTemplate: FeedTemplate, data: string) => Promise<FeedTemplate>;
    update: (data: string) => Promise<FeedTemplate>;
    signFeedDigest: FeedDigestSigner;
}

export const makeFeedApi = (address: FeedAddress, signFeedDigest: FeedDigestSigner, swarmGateway: string = DefaultGateway): WriteableFeedApi => {
    return {
        ...makeReadableFeedApi(address, swarmGateway),

        updateWithFeedTemplate: async (feedTemplate: FeedTemplate, data) => await updateUserFeedWithSignFunction(swarmGateway, feedTemplate, signFeedDigest, data),
        update: async (data: string): Promise<FeedTemplate> => {
            const feedTemplate = await downloadUserFeedTemplate(swarmGateway, address);
            return await updateUserFeedWithSignFunction(swarmGateway, feedTemplate, signFeedDigest, data);
        },
        signFeedDigest,
    };
};

export interface BzzApi {
    download: (hash: string, timeout: number) => Promise<string>;
    upload: (data: string) => Promise<string>;
    uploadPhoto: (localPath: string) => Promise<string>;
}

export const makeBzzApi = (swarmGateway: string = DefaultGateway): BzzApi => {
    return {
        download: (hash: string, timeout: number = 0) => downloadData(hash, timeout, swarmGateway),
        upload: (data: string) => upload(data, swarmGateway),
        uploadPhoto: (localPath: string) => uploadPhoto(localPath, swarmGateway),
    };
};

export interface BaseApi {
    readonly swarmGateway: string;
}

export interface WriteableApi extends BaseApi {
    readonly bzz: BzzApi;
    readonly feed: WriteableFeedApi;
}

export type Api = WriteableApi;

export const makeApi = (address: FeedAddress, signFeedDigest: FeedDigestSigner, swarmGateway: string = DefaultGateway): Api => ({
    bzz: makeBzzApi(swarmGateway),
    feed: makeFeedApi(address, signFeedDigest, swarmGateway),
    swarmGateway,
});

export interface ReadableApi extends BaseApi {
    bzz: BzzApi;
    feed: ReadableFeedApi;
}

export const makeReadableApi = (address: FeedAddress, swarmGateway: string = DefaultGateway): ReadableApi => {
    return {
        bzz: makeBzzApi(swarmGateway),
        feed: makeReadableFeedApi(address, swarmGateway),
        swarmGateway,
    };
};

const topicLength = 32;
const userLength = 20;
const timeLength = 7;
const levelLength = 1;
const headerLength = 8;
const updateMinLength = topicLength + userLength + timeLength + levelLength + headerLength;

function feedUpdateDigest(feedTemplate: FeedTemplate, data: string): number[] {
    const digestData = feedUpdateDigestData(feedTemplate, data);
    Debug.log('updateUserFeed', 'digest', byteArrayToHex(digestData));
    return keccak256.array(digestData);
}

function feedUpdateDigestData(feedTemplate: FeedTemplate, data: string): number[] {
    const dataBytes = stringToByteArray(data);

    const buf = new ArrayBuffer(updateMinLength + dataBytes.length);
    const view = new DataView(buf);
    let cursor = 0;

    view.setUint8(cursor, feedTemplate.protocolVersion); // first byte is protocol version.
    cursor += headerLength; // leave the next 7 bytes (padding) set to zero

    const topicArray = hexToByteArray(feedTemplate.feed.topic);
    topicArray.forEach((v) => {
        view.setUint8(cursor, v);
        cursor++;
    });

    const userArray = hexToByteArray(feedTemplate.feed.user);
    userArray.forEach((v) => {
        view.setUint8(cursor, v);
        cursor++;
    });

    // time is little endian
    const timeBuf = new ArrayBuffer(4);
    const timeView = new DataView(timeBuf);
    // view.setUint32(cursor, o.time);
    timeView.setUint32(0, feedTemplate.epoch.time);
    const timeBufArray = new Uint8Array(timeBuf);
    for (let i = 0; i < 4; i++) {
        view.setUint8(cursor, timeBufArray[3 - i]);
        cursor++;
    }

    for (let i = 0; i < 3; i++) {
        view.setUint8(cursor, 0);
        cursor++;
    }

    // cursor += 4;
    view.setUint8(cursor, feedTemplate.epoch.level);
    cursor++;

    dataBytes.forEach((v) => {
        view.setUint8(cursor, v);
        cursor++;
    });

    const numArray = new Array<number>();
    const uint8Array = new Uint8Array(buf);
    for (let i = 0; i < uint8Array.byteLength; i++) {
        numArray.push(uint8Array[i]);
    }

    return numArray;
}

const calculateRecovery = (rec: string): string => {
    switch (rec) {
        case '1b': return '00';
        case '1c': return '01';
        case '1d': return '02';
        case '1e': return '03';
    }
    throw new Error('invalid recovery: ' + rec);
};

function publicKeyToAddress(pubKey: any) {
    const pubBytes = pubKey.encode();
    return keccak256.array(pubBytes.slice(1)).slice(12);
}

export const signDigest = (digest: number[], identity: PrivateIdentity) => {
    const curve = new ec('secp256k1');
    const keyPair = curve.keyFromPrivate(new Buffer(identity.privateKey.substring(2), 'hex'));
    const sigRaw = curve.sign(digest, keyPair, { canonical: true, pers: undefined });
    const partialSignature = sigRaw.r.toArray().concat(sigRaw.s.toArray());
    if (sigRaw.recoveryParam != null) {
        const signature = partialSignature.concat(sigRaw.recoveryParam);
        return byteArrayToHex(signature);
    }
    throw new Error('signDigest recovery param was null');
};

export const generateSecureIdentity = async (generateRandom: (length: number) => Promise<Uint8Array>): Promise<PrivateIdentity> => {
    const secureRandomUint8Array = await generateRandom(32);
    const secureRandom = byteArrayToHex(secureRandomUint8Array).substring(2);
    const curve = new ec('secp256k1');
    const keyPair = await curve.genKeyPair({
        entropy: secureRandom,
        entropyEnc: 'hex',
        pers: undefined,
    });
    Debug.log('generateSecureIdentity: ', keyPair, secureRandom);
    const privateKey = '0x' + keyPair.getPrivate('hex');
    const publicKey = '0x' + keyPair.getPublic('hex');
    const address = byteArrayToHex(publicKeyToAddress(keyPair.getPublic()));
    return {
        privateKey,
        publicKey,
        address,
    };
};
