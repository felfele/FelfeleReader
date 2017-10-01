import * as React from 'react';
import { View, FlatList, Text, Alert, StyleSheet, Button, Image } from 'react-native';
import * as SettingsList from 'react-native-settings-list';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RSSPostManager } from '../RSSPostManager';

const styles = StyleSheet.create({
    imageStyle: {
        marginLeft: 15,
        alignSelf: 'center',
        height: 30,
        width: 30
    },
    titleInfoStyle: {
        fontSize: 16,
        color: '#8e8e93'
    }
});

const navigationActions = {}

export class FeedListEditor extends React.Component<any, any> {
    constructor(props) {
        super(props);
        this.state = { 
            feeds: RSSPostManager.feedManager.feeds,
        };
        navigationActions['Back'] = this.props.navigation.goBack;
        navigationActions['Add'] = this.onAddFeed.bind(this);
    }

    static navigationOptions = {
        header: undefined,
        title: 'Feed list',
        headerLeft: <Button title='Back' onPress={() => navigationActions['Back']()} />,
        headerRight: <Button title='Add' onPress={() => navigationActions['Add']()} />,
    };

    onAddFeed() {
        this.props.navigation.navigate('EditFeed', {feed: {}});
    }

    editFeed(feed) {
        this.props.navigation.navigate('EditFeed', {feed: feed});
    }

    render() {
        return (
            <View style={{ backgroundColor: '#EFEFF4', flex: 1 }}>
                <View style={{ backgroundColor: '#EFEFF4', flex: 1 }}>
                    <SettingsList borderColor='#c8c7cc' defaultItemSize={50}>
                        {this.state.feeds.map(feed => (
                            <SettingsList.Item
                                title={feed.name}
                                titleInfo={feed.url}
                                key={feed.url}
                                onPress={() => this.editFeed(feed)}
                            />
                        ))}
                    </SettingsList>
                </View>
            </View>
        )
    }
}
                                // icon={
                                //     <Image source={{uri: feed.favicon}} style={{
                                //         width: 30,
                                //         height: 30,
                                //     }}
                                //     />
                                // }