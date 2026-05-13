// src/config/reactotron.config.js
import Reactotron from 'reactotron-react-native';

if (__DEV__) {
  Reactotron
    .configure()          
    .useReactNative({
      networking: true,   // ← this is the network tab
    })
    .connect();
}