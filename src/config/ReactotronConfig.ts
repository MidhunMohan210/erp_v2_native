import Reactotron from "reactotron-react-native";

// Handles: network requests, API logs, AsyncStorage, JS errors
const reactotron = Reactotron.configure({ name: "ERP Mobile App" })
  .useReactNative({
    networking: true,
    asyncStorage: true,
    errors: true,
  })
  .connect();

export default reactotron;
