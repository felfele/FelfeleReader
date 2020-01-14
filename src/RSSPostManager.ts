import { Post, PublicPost } from './models/Post';
import { ImageData } from './models/ImageData';
import { Feed } from './models/Feed';
import { FaviconCache } from './FaviconCache';
import { Utils } from './Utils';
import * as urlUtils from './helpers/urlUtils';
import { HtmlUtils } from './HtmlUtils';
import { ContentFilter } from './models/ContentFilter';
import { Debug } from './Debug';
import {
    HEADERS_WITH_FELFELE,
    HEADERS_WITH_CURL,
    rssFeedHelper,
    RSSFeedWithMetrics,
    RSSFeed,
    RSSMedia,
    RSSEnclosure,
} from './helpers/RSSFeedHelpers';
import { safeFetch } from './Network';
// tslint:disable-next-line:no-var-requires
const he = require('he');

interface ContentWithMimeType {
    content: string;
    mimeType: string;
}

const FirstId = 1;

const RSSMimeTypes = [
    'application/rss+xml',
    'application/x-rss+xml',
    'application/atom+xml',
    'application/xml',
    'text/xml',
];

export class RSSFeedManager {
    public static getFeedUrlFromHtmlLink(link: Node): string {
        for (const mimeType of RSSMimeTypes) {
            const matcher = [{name: 'type', value: mimeType}];
            if (HtmlUtils.matchAttributes(link, matcher)) {
                const feedUrl = HtmlUtils.getAttribute(link, 'href') || '';
                if (feedUrl !== '') {
                    return feedUrl;
                }
            }
        }
        return '';
    }

    public static parseFeedFromHtml(html: any): Feed {
        const feed: Feed = {
            name: '',
            url: '',
            feedUrl: '',
            favicon: '',
        };

        const document = HtmlUtils.parse(html);
        const links = HtmlUtils.findPath(document, ['html', 'head', 'link']);

        for (const link of links) {
            if (feed.feedUrl === '' && HtmlUtils.matchAttributes(link, [{name: 'rel', value: 'alternate'}])) {
                const feedUrl = this.getFeedUrlFromHtmlLink(link);
                if (feedUrl !== '') {
                    feed.feedUrl = feedUrl;
                }
            }
        }

        feed.favicon = FaviconCache.findBestIconFromLinks(links) || '';

        const titles = HtmlUtils.findPath(document, ['html', 'head', 'title']);
        for (const title of titles) {
            if (title.childNodes.length > 0) {
                if (title.childNodes[0].textContent != null) {
                    feed.name = title.childNodes[0].textContent!;
                    break;
                }
                // The lib we use (react-native-parse-html) returns the value
                // incorrectly in 'value' instead of 'textContent'
                // @ts-ignore
                // tslint:disable-next-line:no-string-literal
                const value = title.childNodes[0]['value'];
                if (value != null) {
                    feed.name = value;
                    break;
                }
            }
        }

        return feed;
    }

    public static async fetchContentWithMimeType(url: string): Promise<ContentWithMimeType | null> {
        const isRedditUrl = urlUtils.getHumanHostname(url) === urlUtils.REDDIT_COM;

        try {
            const response = await safeFetch(url, {
                headers: isRedditUrl ? HEADERS_WITH_FELFELE : HEADERS_WITH_CURL,
            });

            const contentType = response.headers.get('Content-Type');
            if (!contentType) {
                return null;
            }

            const parts = contentType.split(';', 2);
            const mimeType = parts.length > 1 ? parts[0] : contentType;

            const content = await response.text();

            return {
                content: content,
                mimeType: mimeType,
            };
        } catch (e) {
            Debug.log('fetchContentWithMimeType', {e});
            return null;
        }
    }

    public static getFeedFromHtml(baseUrl: string, html: string): Feed {
        const feed = RSSFeedManager.parseFeedFromHtml(html);
        if (feed.feedUrl !== '') {
            feed.feedUrl = urlUtils.createUrlFromUrn(feed.feedUrl, baseUrl);
        }
        if (typeof feed.favicon === 'string' && feed.favicon !== '') {
            feed.favicon = urlUtils.createUrlFromUrn(feed.favicon, baseUrl);
        }
        if (feed.name.search(' - ') >= 0) {
            feed.name = feed.name.replace(/ - .*/, '');
        }
        feed.url = baseUrl;
        return feed;
    }

    public static isRssMimeType(mimeType: string): boolean {
        for (const rssMimeType of RSSMimeTypes) {
            if (mimeType === rssMimeType) {
                return true;
            }
        }

        return false;
    }

    public static async fetchRSSFeedUrlFromUrl(url: string): Promise<ContentWithMimeType | null> {
        const contentWithMimeType = await RSSFeedManager.fetchContentWithMimeType(url);
        if (!contentWithMimeType) {
            return null;
        }

        if (RSSFeedManager.isRssMimeType(contentWithMimeType.mimeType)) {
            return contentWithMimeType;
        }

        return null;
    }

    public static async fetchFeedFromHtmlFromUrl(url: string): Promise<string> {
        const contentWithMimeType = await RSSFeedManager.fetchContentWithMimeType(url);
        if (!contentWithMimeType) {
            return '';
        }

        if (contentWithMimeType.mimeType === 'text/html') {
            return url;
        }

        return '';
    }

    public static async tryFetchFeedFromAltLocations(baseUrl: string, feed: Feed): Promise<Feed | null> {
        const altFeedLocations = [
            '/rss',
            '/rss/',
            '/rss/index.rss',
            '/feed',
            '/social-media/feed/',
            '/feed/',
            '/feed/rss/',
            '/',
        ];
        for (const altFeedLocation of altFeedLocations) {
            const altUrl = urlUtils.createUrlFromUrn(altFeedLocation, baseUrl);
            const rssContentWithMimeType = await RSSFeedManager.fetchRSSFeedUrlFromUrl(altUrl);
            if (rssContentWithMimeType != null && RSSFeedManager.isRssMimeType(rssContentWithMimeType.mimeType)) {
                feed.feedUrl = altUrl;
                const rssFeed = await rssFeedHelper.load(altUrl, rssContentWithMimeType.content);
                return {
                    ...feed,
                    name: rssFeed.feed.title === '' ? feed.name : rssFeed.feed.title,
                };
            }
        }
        return null;
    }

    public static async augmentFeedWithMetadata(url: string, rssFeed: RSSFeedWithMetrics, html?: string): Promise<Feed | null> {
        Debug.log('RSSFeedManager.fetchFeedFromUrl', {rssFeed});
        const feedUrl = (rssFeed.feed && rssFeed.feed.url) || undefined;
        const baseUrl = urlUtils.getBaseUrl(feedUrl || url).replace('http://', 'https://');
        Debug.log('RSSFeedManager.fetchFeedFromUrl', {baseUrl});
        const name = Utils.take(rssFeed.feed.title.split(' - '), 1, rssFeed.feed.title)[0];
        const feed: Feed = {
            url: urlUtils.getCanonicalUrl(baseUrl),
            feedUrl: url,
            name: name,
            favicon: rssFeed.feed.icon || '',
        };
        // Fetch the website to augment the feed data with favicon and title
        if (!html) {
            const contentWithMimeType = await RSSFeedManager.fetchContentWithMimeType(baseUrl);
            if (contentWithMimeType == null) {
                return null;
            }
            html = contentWithMimeType.content;
        }
        const feedFromHtml = RSSFeedManager.getFeedFromHtml(baseUrl, html);
        if (feed.name === '') {
            feed.name = feedFromHtml.name;
        }
        if (urlUtils.getHumanHostname(url) === urlUtils.REDDIT_COM) {
            feed.favicon = await FaviconCache.getFavicon(url);
        } else {
            feed.favicon = feedFromHtml.favicon || rssFeed.feed.icon || '';
        }
        return feed;

    }

    // url can be either a website url or a feed url
    public static async fetchFeedFromUrl(url: string): Promise<Feed | null> {
        const contentWithMimeType = await RSSFeedManager.fetchContentWithMimeType(url);
        if (!contentWithMimeType) {
            return null;
        }

        Debug.log('RSSFeedManager.fetchFeedFromUrl', {mimeType: contentWithMimeType.mimeType});

        if (contentWithMimeType.mimeType === 'text/html') {
            const baseUrl = urlUtils.getBaseUrl(url);
            Debug.log('RSSFeedManager.fetchFeedFromUrl', {baseUrl});
            const feed = RSSFeedManager.getFeedFromHtml(baseUrl, contentWithMimeType.content);
            Debug.log('RSSFeedManager.fetchFeedFromUrl', {feed});
            if (feed.feedUrl !== '') {
                const rssFeed = await rssFeedHelper.fetch(feed.feedUrl);
                const augmentedFeed = await RSSFeedManager.augmentFeedWithMetadata(feed.feedUrl, rssFeed, contentWithMimeType.content);
                if (augmentedFeed != null) {
                    return augmentedFeed;
                }
            }

            const altFeed = await RSSFeedManager.tryFetchFeedFromAltLocations(baseUrl, feed);
            if (altFeed?.feedUrl !== '') {
                const rssFeed = await rssFeedHelper.fetch(feed.feedUrl);
                const augmentedFeed = await RSSFeedManager.augmentFeedWithMetadata(feed.feedUrl, rssFeed, contentWithMimeType.content);
                if (augmentedFeed != null) {
                    return augmentedFeed;
                }
            }
        }

        // It looks like there is a valid feed on the url
        if (RSSFeedManager.isRssMimeType(contentWithMimeType.mimeType)) {
            const rssFeed = await rssFeedHelper.load(url, contentWithMimeType.content);
            Debug.log('RSSFeedManager.fetchFeedFromUrl', {rssFeed});
            const augmentedFeed = await RSSFeedManager.augmentFeedWithMetadata(url, rssFeed);
            if (augmentedFeed != null) {
                return augmentedFeed;
            }
    }

        return null;
    }
}

const feedFaviconString = (favicon: string | number): string => {
    return typeof favicon === 'number' ? '' : favicon;
};

// tslint:disable-next-line:class-name
class _RSSPostManager {
    public readonly feedManager = new RSSFeedManager();

    private id = FirstId;
    private contentFilters: ContentFilter[] = [];

    public setContentFilters(contentFilters: ContentFilter[]) {
        this.contentFilters = contentFilters;
    }

    public async loadPosts(storedFeeds: Feed[]): Promise<PublicPost[]> {
        const startTime = Date.now();
        const posts: Post[] = [];
        const metrics: RSSFeedWithMetrics[] = [];

        const feedMap: { [index: string]: string } = {};
        for (const feed of storedFeeds) {
            feedMap[feed.feedUrl] = feed.name;
        }

        let downloadSize = 0;
        const firstLoad = this.id === FirstId;
        const loadFeedPromises = storedFeeds.map(feed => this.loadFeed(feed.feedUrl));
        const feeds = await Promise.all(loadFeedPromises);
        for (const feedWithMetrics of feeds) {
            if (feedWithMetrics) {
                downloadSize += feedWithMetrics.size;
                const rssFeed = feedWithMetrics.feed;
                const storedFeed = storedFeeds.find(feed => urlUtils.compareUrls(feed.url, rssFeed.url));
                const favicon = storedFeed && storedFeed.favicon && storedFeed.favicon !== ''
                    ? storedFeed.favicon
                    : rssFeed.icon
                        ? rssFeed.icon
                        : ''
                ;
                const faviconString = feedFaviconString(favicon);
                Debug.log('RSSPostManager.loadPosts', {rssFeed, storedFeeds, favicon});
                const feedName = feedMap[feedWithMetrics.url] || feedWithMetrics.feed.title;
                const convertedPosts = this.convertRSSFeedtoPosts(rssFeed, feedName, faviconString, feedWithMetrics.url);
                posts.push.apply(posts, convertedPosts);
                metrics.push(feedWithMetrics);
            }
        }
        // Don't update when there are no new posts, e.g. when the network is down
        if (!firstLoad && posts.length === 0) {
            return [];
        }

        if (__DEV__) {
            const stats = metrics
                .map(metric => `${urlUtils.getHumanHostname(metric.feed.url)}: s${metric.size} d${metric.downloadTime} x${metric.xmlTime} p${metric.parseTime}`)
                .join('\n');

            const elapsed = Date.now() - startTime;
            const firstPost: Post = {
                _id: 1,
                images: [],
                text: `Debug message: downloaded ${downloadSize} bytes, elapsed ${elapsed}\n${stats}`,
                createdAt: Date.now(),
                author: {
                    name: 'Felfele',
                    uri: '',
                    image: {
                    },
                },
            };
            return [firstPost, ...posts];
        }
        return posts;
    }

    public getNextId(): number {
        return ++this.id;
    }

    public htmlToMarkdown(description: string): string {
        const strippedHtml = description
            // strip spaces at the beginning of lines
            .replace(/^( *)/gm, '')
            // strip newlines
            .replace(/\n/gm, '')
            // replace CDATA tags with content
            .replace(/<!\[CDATA\[(.*?)\]\]>/gm, '$1')
            // replace html links to markdown links
            .replace(/<a.*?href=['"](.*?)['"].*?>(.*?)<\/a>/gi, '[$2]($1)')
            // replace html images to markdown images
            .replace(/<img.*?src=['"](.*?)['"].*?>/gi, '![]($1)')
            // replace html paragraphs to markdown paragraphs
            .replace(/<p.*?>/gi, '\n\n')
            // strip other html tags
            .replace(/<(\/?[a-z]+.*?>)/gi, '')
            // strip html comments
            .replace(/<!--.*?-->/g, '')
            // replace multiple space with one space
            .replace(/ +/g, ' ')
            ;

        return he.decode(strippedHtml);
    }

    public extractTextAndImagesFromMarkdown(markdown: string, baseUri: string): [string, ImageData[]] {
        const images: ImageData[] = [];
        const text = markdown.replace(/(\!\[\]\(.*?\))/gi, (uri) => {
            const image: ImageData = {
                uri: baseUri + uri
                        .replace('!', '')
                        .replace('[', '')
                        .replace(']', '')
                        .replace('(', '')
                        .replace(')', ''),
            };
            images.push(image);
            return '';
        });
        return [text, images];
    }

    public matchString(a: string, b: string): boolean {
        for (let i = 0; i < a.length; i++) {
            if (i >= b.length) {
                return false;
            }
            if (a[i] !== b[i]) {
                return false;
            }
        }
        return true;
    }

    public isTitleSameAsText(title: string, text: string): boolean {
        const replacedText = urlUtils.stripNonAscii(text.replace(/\[(.*?)\]\(.*?\)/g, '$1').trim());
        const trimmedTitle = urlUtils.stripNonAscii(title.trim());
        const isSame =  this.matchString(trimmedTitle, replacedText);
        return isSame;
    }

    private async loadFeed(feedUrl: string): Promise<RSSFeedWithMetrics | null> {
        try {
            const rss = await rssFeedHelper.fetch(feedUrl);
            return rss;
        } catch (e) {
            Debug.log(e, feedUrl);
            return null;
        }
    }

    private stripTrailing = (s: string, trail: string): string => {
        if (s.endsWith(trail)) {
            return s.substr(0, s.length - trail.length);
        }
        return s;
    }

    private convertRSSFeedtoPosts(rssFeed: RSSFeed, feedName: string, favicon: string, feedUrl: string): Post[] {
        const links: Set<string> = new Set();
        const strippedFavicon = this.stripTrailing(favicon, '/');
        const posts = rssFeed.items.map(item => {
            const markdown = this.htmlToMarkdown(item.description);
            const [text, markdownImages] = this.extractTextAndImagesFromMarkdown(markdown, '');
            const mediaImages = this.extractImagesFromMedia(item.media);
            const enclosureImages = this.extractImagesFromEnclosures(item.enclosures);
            const images = markdownImages
                            .concat(mediaImages)
                            .concat(markdownImages.length === 0 ? enclosureImages : []);
            const title = this.isTitleSameAsText(item.title, text)
                ? ''
                : item.title === '(Untitled)'
                    ? ''
                    : '**' + item.title + '**' + '\n\n'
                ;
            const post: Post = {
                _id: this.getNextId(),
                text: (title + text).trim() + '\n\n',
                createdAt: item.created,
                images,
                link:  item.link,
                author: {
                    name: feedName,
                    uri: feedUrl,
                    image: {
                        uri: strippedFavicon,
                    },
                },
            };
            return post;
        }).filter(post => {
            if (this.matchContentFilters(post.text)) {
                return false;
            }
            if (post.link != null && links.has(post.link)) {
                return false;
            }
            if (post.link != null) {
                links.add(post.link);
            }

            return true;
        });

        return posts;
    }

    private extractImagesFromMedia(media?: RSSMedia): ImageData[] {
        if (media == null || media.thumbnail == null) {
            return [];
        }
        const images = media.thumbnail.map(thumbnail => ({
            uri: thumbnail.url[0],
            width: thumbnail.width[0],
            height: thumbnail.height[0],
        } as ImageData));
        return images;
    }

    private isSupportedImageType(type: string): boolean {
        if (type === 'image/jpeg' || type === 'image/jpg' || type === 'image/png') {
            return true;
        }
        return false;
    }

    private extractImagesFromEnclosures(enclosures?: RSSEnclosure[]): ImageData[] {
        if (enclosures == null) {
            return [];
        }
        const images = enclosures
                        .filter(enclosure => this.isSupportedImageType(enclosure.type))
                        .map(enclosure => ({uri: enclosure.url}))
                        ;
        return images;
    }

    private matchContentFilters(text: string): boolean {
        for (const filter of this.contentFilters) {
            const regexp = new RegExp(filter.text, 'i');
            if (text.search(regexp) !== -1) {
                return true;
            }
        }
        return false;
    }
}

export const RSSPostManager = new _RSSPostManager();
