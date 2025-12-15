declare module 'react-native-vector-icons/Ionicons' {
  import { Icon } from 'react-native-vector-icons/Icon';
  const Ionicons: Icon;
  export default Ionicons;
}

declare module 'react-native-vector-icons/*' {
  const Icon: any;
  export default Icon;
}
