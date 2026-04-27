// craco.config.js
const path = require("path");
require("dotenv").config();

// لو حابب تشغّل الـ health check خليه true، لكن هنا بنعطّله
const config = {
  enableHealthCheck: false,
  enableVisualEdits: false, // تعطيل visual edits نهائيًا
};

// إعدادات Webpack و ESLint
const webpackConfig = {
  eslint: {
    configure: {
      extends: ["plugin:react-hooks/recommended"],
      rules: {
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "warn",
      },
    },
  },
  webpack: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    configure: (webpackConfig) => {
      // تقليل المجلدات اللي بتتراقب في وضع dev
      webpackConfig.watchOptions = {
        ...webpackConfig.watchOptions,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/build/**",
          "**/dist/**",
          "**/coverage/**",
          "**/public/**",
        ],
      };

      // إضافة loader للملفات النصية (للخط العربي)
      webpackConfig.module.rules.push({
        test: /\.txt$/,
        type: "asset/source",
      });

      // مش هنضيف health plugin لأننا معطّلينه فوق
      return webpackConfig;
    },
  },
};

// تعطيل إضافة أي Babel plugins خاصة بالvisual edits
// (ما فيش babelMetadataPlugin هنا أصلاً)

// إعداد devServer (من غير visual edits ولا health endpoints)
webpackConfig.devServer = (devServerConfig) => {
  // ممكن تضيف أي إعدادات devServer تحتاجها هنا لاحقًا
  return devServerConfig;
};

module.exports = webpackConfig;
