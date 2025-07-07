import RNFetchBlob from 'rn-fetch-blob';
import { Platform } from 'react-native';

export const getPathForFirebaseStorage = async (uri) => {
    if (Platform.OS === 'ios') {
        return uri;
    }
    const stat = await RNFetchBlob.fs.stat(uri);
    return stat.path;
};
