// @ts-ignore
import FSStorage from 'redux-persist-fs-storage';
import * as RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import thunkMiddleware from 'redux-thunk';
import {
    createMigrate,
    PersistConfig,
    persistReducer,
    persistStore,
    getStoredState,
} from 'redux-persist';
import { createStore, compose, applyMiddleware, Store } from 'redux';

import { currentAppStateVersion, AppState } from '../reducers/AppState';
import { migrateAppState } from '../reducers/migration';
import { appStateReducer } from '../reducers';
import { defaultState } from '../reducers/defaultData';
import { Actions } from '../actions/Actions';
import { getAppGroup } from '../BuildEnvironment';
import { Debug } from '../Debug';

// This is not very nice, but it's initialized at app startup
export let persistConfig: FelfelePersistConfig;

const getIOSStorageEngine = async () => {
    const group = getAppGroup();
    const path = await RNFS.pathForGroup(group);
    Debug.log('getIOSStorageEngine', {group, path});
    return FSStorage(path);
};

const getStorageEngine = async () => {
    return Platform.OS === 'ios'
        ? getIOSStorageEngine()
        : FSStorage()
    ;
};

class FelfelePersistConfig implements PersistConfig {
    public blacklist = ['currentTimestamp'];
    public key = 'root';
    public keyPrefix = '';
    public version = currentAppStateVersion;
    public migrate = createMigrate(migrateAppState, { debug: false });

    constructor(public storage: any) { }
}

export const initStore = async (initCallback: (store: Store<AppState, Actions>) => void) => {
    const storageEngine = await getStorageEngine();
    persistConfig = new FelfelePersistConfig(storageEngine);
    const persistedReducer = persistReducer(persistConfig, appStateReducer);

    const storeInner = createStore(
        persistedReducer,
        defaultState,
        compose(
            applyMiddleware(thunkMiddleware),
        ),
    );

    const persistorInner = persistStore(storeInner, {}, () => {
        initCallback(storeInner);
    });

    return {
        store: storeInner,
        persistor: persistorInner,
        persistConfig,
    };
};

export const getSerializedAppState = async (): Promise<string> => {
    const serializedAppState = await persistConfig.storage.getItem(persistConfig.key);
    if (serializedAppState != null) {
        return serializedAppState;
    }
    throw new Error('serialized app state is null');
};

export const getAppStateFromSerialized = async (serializedAppState: string): Promise<AppState> => {
    const storagePersistConfig = {
        ...persistConfig,
        storage: {
            getItem: (key: string) => new Promise<string>((resolve, reject) => resolve(serializedAppState)),
            setItem: (key: string, value: any) => { /* do nothing */ },
            removeItem: (key: string) => { /* do nothing */ },
        },
    };
    const appState = await getStoredState(storagePersistConfig) as AppState;
    return appState;
};

export const migrateAppStateToCurrentVersion = async (appState: AppState): Promise<AppState> => {
    const currentVersionAppState = await persistConfig.migrate(appState, currentAppStateVersion) as AppState;
    return currentVersionAppState;
};
