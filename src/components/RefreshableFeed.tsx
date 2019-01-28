import * as React from 'react';
import {
    View,
    FlatList,
    RefreshControl,
    StyleSheet,
    SafeAreaView,
    LayoutAnimation,
} from 'react-native';
import { Post } from '../models/Post';
import { Colors } from '../styles';
import { StatusBarView } from './StatusBarView';
import { Settings } from '../models/Settings';
import { Feed } from '../models/Feed';
import { CardContainer } from '../containers/CardContainer';
import { Props as NavHeaderProps } from './NavigationHeader';
import { Props as FeedHeaderProps } from './FeedHeader';

export interface DispatchProps {
    onRefreshPosts: (feeds: Feed[]) => void;
}

export interface StateProps {
    navigation: any;
    posts: Post[];
    feeds: Feed[];
    settings: Settings;
    children: {
        // WARNING, type parameter included for reference, but it does not typecheck
        listHeader?: React.ReactElement<FeedHeaderProps>,
        navigationHeader?: React.ReactElement<NavHeaderProps>,
    };
}

interface RefreshableFeedState {
    selectedPost: Post | null;
    isRefreshing: boolean;
}

export class RefreshableFeed extends React.PureComponent<DispatchProps & StateProps, RefreshableFeedState> {
    public state: RefreshableFeedState = {
        selectedPost: null,
        isRefreshing: false,
    };

    public componentDidUpdate(prevProps) {
        if (this.props.posts !== prevProps.posts) {
            this.setState({
                isRefreshing: false,
            });
        }
    }

    public render() {
        return (
            <SafeAreaView
                style={{
                    flexDirection: 'column',
                    padding: 0,
                    flex: 1,
                    height: '100%',
                    opacity: 0.96,
                }}
            >
                <StatusBarView
                    backgroundColor={Colors.BACKGROUND_COLOR}
                    hidden={false}
                    translucent={false}
                    barStyle='dark-content'
                    networkActivityIndicatorVisible={true}
                />
                {this.props.children.navigationHeader}
                <FlatList
                    ListHeaderComponent={this.props.children.listHeader}
                    ListFooterComponent={this.renderListFooter}
                    data={this.props.posts}
                    renderItem={(obj) => (
                        <CardContainer
                            post={obj.item}
                            isSelected={this.isPostSelected(obj.item)}
                            navigate={this.props.navigation.navigate}
                            togglePostSelection={this.togglePostSelection}
                            showSquareImages={this.props.settings.showSquareImages}
                        />
                    )}
                    keyExtractor={(item) => '' + item._id}
                    extraData={this.state}
                    refreshControl={
                        <RefreshControl
                            refreshing={this.state.isRefreshing}
                            onRefresh={() => this.onRefresh() }
                            progressViewOffset={HeaderOffset}
                            style={styles.refreshControl}
                        />
                    }
                    style={{
                        backgroundColor: Colors.BACKGROUND_COLOR,
                    }}
                />
            </SafeAreaView>
        );
    }

    private onRefresh() {
        this.setState({
            isRefreshing: true,
        });
        this.props.onRefreshPosts(this.props.feeds);
    }

    private isPostSelected = (post: Post): boolean => {
        return this.state.selectedPost != null && this.state.selectedPost._id === post._id;
    }

    private togglePostSelection = (post: Post) => {
        LayoutAnimation.easeInEaseOut();
        if (this.isPostSelected(post)) {
            this.setState({ selectedPost: null });
        } else {
            this.setState({ selectedPost: post });
        }
    }

    private renderListFooter = () => {
        return (
            <View style={{
                height: 100,
            }}
            />
        );
    }
}

const HeaderOffset = 20;

const styles = StyleSheet.create({
    refreshControl: { },
});