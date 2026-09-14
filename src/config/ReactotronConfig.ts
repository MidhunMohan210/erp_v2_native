import Reactotron from "reactotron-react-native";
import { reactotronRedux } from "reactotron-redux";

// Handles: network requests, API logs, AsyncStorage, JS errors
const reactotron = Reactotron.configure({ name: "ERP Mobile App" })
  .useReactNative({
    networking: true,
    asyncStorage: true,
    errors: true,
  })
  .use(reactotronRedux())
  .connect();

export default reactotron;
