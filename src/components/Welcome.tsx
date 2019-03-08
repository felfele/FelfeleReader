import * as React from 'react';
// @ts-ignore
import Onboarding from 'react-native-onboarding-swiper';
import {
    Image,
} from 'react-native';

import { IdentityOnboarding, DispatchProps as IdentityOnboardingDispatchProps  } from '../components/IdentityOnboarding';
import { ImageData } from '../models/ImageData';
import { Author } from '../models/Post';
import SplashScreen from 'react-native-splash-screen';
import { Colors } from '../styles';

export interface DispatchProps extends IdentityOnboardingDispatchProps {
    onDownloadPosts: () => void;
    onCreateFeed: () => void;
}

export interface StateProps {
    navigation: any;
    author: Author;
    gatewayAddress: string;
}

type Props = DispatchProps & StateProps;

export interface State {
    authorName: string;
    authorImage: ImageData;
}

export class Welcome extends React.PureComponent<Props, State> {
    public state: State = {
        authorName: 'Space Cowboy',
        authorImage: {},
    };

    public componentDidMount() {
        SplashScreen.hide();
    }

    public render() {
        return (
            <Onboarding
                flatlistProps={{
                    keyboardShouldPersistTaps: 'handled',
                }}
                pages={[{
                    backgroundColor: Colors.BRAND_PURPLE,
                    image: <Image source={require('../../images/icon-white-transparent.png')} style={{
                        width: 150,
                        height: 150,
                    }}/>,
                    title: 'Welcome to Felfele',
                    subtitle: 'Socialize without Compromise',
                }, {
                    backgroundColor: Colors.BRAND_PURPLE,
                    image: <IdentityOnboarding
                        onUpdateAuthor={(text: string) => {
                            this.setState({
                                authorName: text,
                            });
                        }}
                        onUpdatePicture={(image: ImageData) => {
                            this.setState({
                                authorImage: image,
                            });
                        }}
                        author={{
                            ...this.props.author,
                            name: this.state.authorName,
                            image: this.state.authorImage,
                        }}
                        gatewayAddress={this.props.gatewayAddress}
                    />,
                    title: 'Get Started',
                    subtitle: 'Pick a name and an avatar',
                },
                ]}
                onDone={() => {
                    this.props.onUpdateAuthor(this.state.authorName);
                    this.props.onUpdatePicture(this.state.authorImage);
                    this.props.onCreateFeed();
                    this.props.onDownloadPosts();
                    this.props.navigation.navigate('Loading');
                }}
                showSkip={false}
            />
        );
    }
}
