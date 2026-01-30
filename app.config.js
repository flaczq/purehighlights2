import 'dotenv/config';

export default ({ config }) => {
  return {
    ...config,
    name: "Pure Highlights 2.0",
    slug: "pure-highlights-2",
    plugins: [
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: process.env.ADMOB_APP_ID,
          iosAppId: process.env.ADMOB_APP_ID
        }
      ]
    ]
  };
};
