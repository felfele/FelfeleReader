import * as React from 'react';
// @ts-ignore
import Onboarding from 'react-native-onboarding-swiper';
import {
    Image,
} from 'react-native';

import { IdentityOnboarding, DispatchProps as IdentityOnboardingDispatchProps  } from '../components/IdentityOnboarding';
import { ImageData } from '../models/ImageData';
import SplashScreen from 'react-native-splash-screen';
import { Colors } from '../styles';
import { defaultImages} from '../defaultImages';
import { getDefaultUserImage } from '../defaultUserImage';
import { defaultAuthor } from '../reducers/defaultData';
import { TypedNavigation } from '../helpers/navigation';
import { TouchableView } from './TouchableView';

export interface DispatchProps {
    onStartDownloadFeeds: () => void;
    onCreateUser: (name: string, image: ImageData, navigation: TypedNavigation) => void;
}

export interface StateProps {
    navigation: TypedNavigation;
    gatewayAddress: string;
}

type Props = DispatchProps & StateProps;

export interface State {
    authorName: string;
    authorImage: ImageData;
}

export class Welcome extends React.PureComponent<Props, State> {
    public state: State = {
        authorName: defaultAuthor.name,
        authorImage: defaultAuthor.image,
    };

    public componentDidMount() {
        SplashScreen.hide();
        this.props.onStartDownloadFeeds();
    }

    public render() {
        return (
            <Onboarding
                flatlistProps={{
                    keyboardShouldPersistTaps: 'handled',
                }}
                pages={[{
                    backgroundColor: Colors.BRAND_PURPLE,
                    image:
                        <TouchableView
                            onLongPress={this.onDone}
                            testID='Welcome'
                        >
                            <Image source={defaultImages.iconWhiteTransparent} style={{
                                width: 150,
                                height: 150,
                            }}/>
                        </TouchableView>

                        ,
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
                            ...defaultAuthor,
                            name: this.state.authorName,
                            image: this.state.authorImage,
                        }}
                        gatewayAddress={this.props.gatewayAddress}
                    />,
                    title: 'Get Started',
                    subtitle: 'Pick a name and an avatar',
                },
                ]}
                onDone={this.onDone}
                showSkip={false}
            />
        );
    }

    private onDone = async () => {
        this.props.onCreateUser(
            this.state.authorName !== ''
                ? this.state.authorName
                : defaultAuthor.name
            ,
            this.state.authorImage.uri !== ''
                ? this.state.authorImage
                : await getDefaultUserImage()
            ,
            this.props.navigation,
        );
    }
}
