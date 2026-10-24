import 'react-native-gesture-handler';      // first
import 'react-native-get-random-values';    // before uuid / supabase
import 'react-native-url-polyfill/auto';    // before supabase
import { registerRootComponent } from 'expo';

import App from './src/app/App';

registerRootComponent(App);

