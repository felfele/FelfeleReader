import { connect } from 'react-redux';
import { AppState } from '../reducers/AppState';
import { AsyncActions, Actions } from '../actions/Actions';
import { StateProps, DispatchProps, PostEditor } from '../components/PostEditor';
import { Post } from '../models/Post';

const mapStateToProps = (state: AppState, ownProps: { navigation: any }): StateProps => {
    const post = ownProps.navigation.state.params ! = null ? ownProps.navigation.state.params.post : null;
    return {
        name: state.author.name,
        avatar: state.author.image,
        navigation: ownProps.navigation,
        draft: post != null ? post : state.draft,
        gatewayAddress: state.settings.swarmGatewayAddress,
   };
};

const mapDispatchToProps = (dispatch: any): DispatchProps => {
   return {
       onPost: (post: Post) => {
            dispatch(AsyncActions.createPost(post));
       },
       onSaveDraft: (draft: Post) => {
           dispatch(Actions.addDraft(draft));
       },
       onDeleteDraft: () => {
           dispatch(Actions.removeDraft());
       },
   };
};

export const PostEditorContainer = connect(
   mapStateToProps,
   mapDispatchToProps,
)(PostEditor);
