export enum ActionTypes {
    ADD_CONTENT_FILTER = 'ADD-CONTENT-FILTER',
    REMOVE_CONTENT_FILTER = 'REMOVE-CONTENT-FILTER',
    REMOVE_ALL_CONTENT_FILTERS = 'REMOVE-ALL-CONTENT-FILTERS',

    ADD_FEED = 'ADD-FEED',
    REMOVE_FEED = 'REMOVE-FEED',
    FOLLOW_FEED = 'FOLLOW-FEED',
    UNFOLLOW_FEED = 'UNFOLLOW-FEED',
    TOGGLE_FEED_FAVORITE = 'TOGGLE-FEED-FAVORITE',
    UPDATE_FEED_FAVICON = 'UPDATE-FEED-FAVICON',
    ADD_OWN_FEED = 'ADD-OWN-FEED',
    UPDATE_OWN_FEED = 'UPDATE-OWN-FEED',
    UPDATE_FEED = 'UPDATE-FEED',
    CLEAN_FEEDS_FROM_OWN_FEEDS = 'CLEAN-FEEDS-FROM-OWN-FEEDS',
    REMOVE_ALL_FEEDS = 'REMOVE-ALL-FEEDS',
    MERGE_FEEDS_WITH_EXISTING_FEEDS = 'MERGE_FEEDS_WITH_EXISTING_FEEDS',

    TIME_TICK = 'TIME-TICK',

    UPDATE_RSS_POSTS = 'UPDATE-RSS-POSTS',
    REMOVE_RSS_POST = 'REMOVE-RSS-POST',

    APP_STATE_RESET = 'APP-STATE-RESET',
    APP_STATE_SET = 'APP-STATE-SET',

    CHANGE_SETTING_SHOW_SQUARE_IMAGES = 'CHANGE-SETTING-SHOW-SQUARE-IMAGES',
    CHANGE_SETTING_SHOW_DEBUG_MENU = 'CHANGE-SETTING-SHOW-DEBUG-MENU',
    CHANGE_SETTING_SWARM_GATEWAY_ADDRESS = 'CHANGE-SETTING-SWARM-GATEWAY-ADDRESS',
}
