import * as React from 'react';
import {
    View,
} from 'react-native';
import { Author } from '../models/Author';
import { TypedNavigation, Routes } from '../helpers/navigation';

export interface DispatchProps { }

export interface StateProps {
    author: Author;
    navigation: TypedNavigation;
}

export const LoadingScreen = (props: DispatchProps & StateProps) => {
    return (
        <View>
            { props.navigation.navigate('App', {}) }
        </View>
    );
};
