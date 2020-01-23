import * as React from 'react';
import {
    StyleSheet,
    View,
    Dimensions,
    RegisteredStyle,
    ViewStyle,
    Clipboard,
} from 'react-native';
import QRCodeScanner from 'react-native-qrcode-scanner';

import { SimpleTextInput } from '../../misc/SimpleTextInput';
import { ComponentColors, Colors, defaultMediumFont } from '../../../styles';
import { NavigationHeader } from '../../misc/NavigationHeader';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TypedNavigation } from '../../../helpers/navigation';
import { FragmentSafeAreaView } from '../../misc/FragmentSafeAreaView';
import { getHttpLinkFromText } from '../../../helpers/urlUtils';
import { FEEDS_LINK_MESSAGE } from '../../../helpers/linkHelpers';
import { errorDialog } from '../../../helpers/dialogs';

const QRCameraWidth = Dimensions.get('window').width;
const QRCameraHeight = QRCameraWidth;

interface State {
}

export interface DispatchProps { }

export interface StateProps {
    navigation: TypedNavigation;
}

type Props = DispatchProps & StateProps;

export class FeedLinkReader extends React.Component<Props, State> {
    public render() {
        const icon = (name: string, size: number = 20) =>
            <Icon name={name} size={size} color={ComponentColors.NAVIGATION_BUTTON_COLOR} />;

        return (
            <FragmentSafeAreaView>
                <NavigationHeader
                    title={'Add feed'}
                    leftButton={{
                        label: icon('close', 24),
                        onPress: () => this.props.navigation.goBack(null),
                    }}
                    navigation={this.props.navigation}
                />
                <View style={styles.container}>
                    <SimpleTextInput
                        style={styles.linkInput}
                        placeholder='Scan QR code or paste link here'
                        placeholderTextColor={Colors.MEDIUM_GRAY}
                        autoCapitalize='none'
                        autoFocus={true}
                        autoCorrect={false}
                        returnKeyType='done'
                        onSubmitEditing={(text) => this.handleLink(text)}
                        onEndEditing={() => {}}
                    />
                    <View style={styles.qrCameraContainer}>
                        <QRCodeScanner
                            onRead={(event) => this.onScanSuccess(event.data)}
                            containerStyle={styles.qrCameraStyle as any as RegisteredStyle<ViewStyle>}
                            cameraStyle={styles.qrCameraStyle as any as RegisteredStyle<ViewStyle>}
                            fadeIn={false}
                            cameraProps={{ratio: '1:1'}}
                        />
                    </View>
                </View>
            </FragmentSafeAreaView>
        );
    }

    public async componentDidMount() {
        const clipboardText = await Clipboard.getString();
        if (clipboardText.startsWith(FEEDS_LINK_MESSAGE)) {
            const link = getHttpLinkFromText(clipboardText);
            if (link != null) {
                this.props.navigation.replace('RSSFeedLoader', { feedUrl: link });
            }
        }
    }

    private handleLink(text: string) {
        const feedUrl = text;
        this.props.navigation.replace('RSSFeedLoader', { feedUrl });
    }

    private onScanSuccess = (data: any) => {
        this.handleLink(data);
    }
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: ComponentColors.BACKGROUND_COLOR,
        flex: 1,
        flexDirection: 'column',
    },
    linkInput: {
        width: '100%',
        backgroundColor: 'white',
        paddingHorizontal: 10,
        paddingVertical: 14,
        color: Colors.DARK_GRAY,
        fontSize: 14,
        fontFamily: defaultMediumFont,
        marginTop: 10,
    },
    qrCameraContainer: {
        width: QRCameraWidth,
        height: QRCameraHeight,
        padding: 0,
        alignSelf: 'center',
        flexDirection: 'column',
    },
    qrCameraStyle: {
        width: QRCameraWidth,
        height: QRCameraHeight,
    },
});
