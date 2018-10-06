import { connect } from 'react-redux';
import { AppState } from '../reducers/index';
import { Actions } from '../actions/Actions';
import { StateProps, DispatchProps, IdentitySettings } from '../components/IdentitySettings';

const mapStateToProps = (state: AppState, ownProps): StateProps => {
    return {
        identity: state.identity,
        navigation: ownProps.navigation,
   };
};

const mapDispatchToProps = (dispatch): DispatchProps => {
    return {
        onUpdateAuthor: (text: string) => {
            dispatch(Actions.updateAuthorName(text));
        },
        onUpdatePicture: (path: string) => {
            dispatch(Actions.updatePicturePath(path));
        },
    };
};

export const IdentitySettingsContainer = connect<StateProps, DispatchProps, {}>(
   mapStateToProps,
   mapDispatchToProps,
)(IdentitySettings);
