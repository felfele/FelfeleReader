import { connect } from 'react-redux';
import { StateProps, NewsSourceGridScreen, DispatchProps } from './NewsSourceGridScreen';
import { AppState } from '../../../reducers/AppState';
import { Feed } from '../../../models/Feed';
import { AsyncActions } from '../../../actions/asyncActions';
import { TypedNavigation } from '../../../helpers/navigation';

const mapStateToProps = (state: AppState, ownProps: { navigation: TypedNavigation }): StateProps => {
    const subCategoryName = ownProps.navigation.getParam<'NewsSourceGridContainer', 'subCategoryName'>('subCategoryName');
    const feeds = ownProps.navigation.getParam<'NewsSourceGridContainer', 'feeds'>('feeds');

    return {
        subCategoryName: subCategoryName,
        feeds,
        navigation: ownProps.navigation,
    };
};

export const mapDispatchToProps = (dispatch: any): DispatchProps => {
    return {
        downloadPostsForNewsSource: (feed: Feed) => {
            dispatch(AsyncActions.downloadPostsFromFeeds([feed]));
        },
    };
};

export const NewsSourceGridContainer = connect(mapStateToProps, mapDispatchToProps)(NewsSourceGridScreen);
