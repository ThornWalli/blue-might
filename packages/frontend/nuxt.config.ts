import { existsSync } from 'fs';

import { join, resolve } from 'pathe';
import { defineNuxtConfig } from 'nuxt/config';
import { joinURL, withHttps } from 'ufo';
import { readPackage } from 'read-pkg';
import { config } from 'dotenv-mono';
import svgLoader from 'vite-svg-loader';

// import viteMkcert from 'vite-plugin-mkcert';
import svgoConfig from './svgo.config';

config();

const isDev = process.env.NODE_ENV === 'development';

const pkg = await readPackage({ cwd: resolve(process.cwd(), '../..') });

function getAliases() {
  return Object.fromEntries(
    Object.entries({
      ['@blue-might/app']: 'app',
      ['@blue-might/maps']: 'maps',
      ['@blue-might/units']: 'units',
      ['@blue-might/weapon']: 'weapon',
      ['@blue-might/debug']: 'debug'
    })
      .map(([name, packageName]) => {
        return [
          [name, resolve(__dirname, '../', packageName)],
          [join(name, '*'), resolve(__dirname, '../', packageName, '*')]
        ];
      })
      .flat()
  );
}

export default defineNuxtConfig({
  compatibilityDate: '2025-08-23',

  dev: isDev,
  devtools: { enabled: false },

  srcDir: './src',

  css: [
    '@/assets/css/base.pcss',
    '@blue-might/app/assets/css/vars.pcss',
    '@blue-might/app/assets/css/transitions.pcss',
    '@blue-might/app/assets/css/base.pcss',
    '@blue-might/app/assets/css/grid.pcss'
  ],

  imports: {
    autoImport: false
  },

  runtimeConfig: {
    public: {
      version: pkg.version,
      blueMight: {}
    }
  },

  ssr: true,

  devServer: {
    port: getPort(),
    host: getHost(),

    https: getHttps()
  },

  alias: {
    ...getAliases()
  },
  build: {
    analyze: false,
    transpile: ['rxjs']
  },

  vite: {
    assetsInclude: ['**/*.md'],
    plugins: [
      // viteMkcert({
      //   savePath: './.certs',
      //   force: !getHttps()
      // }),
      svgLoader({
        defaultImport: 'component',
        svgo: true,
        svgoConfig: svgoConfig as unknown as object
      })
    ]
  },

  postcss: {
    plugins: {
      'postcss-preset-env': {
        preserve: true,
        stage: 0,
        importFrom: 'src/globals/postcss.js',
        features: {
          'custom-properties': {
            disableDeprecationNotice: true
          },
          'nesting-rules': true
        }
      },
      'postcss-normalize': {},
      // '@fullhuman/postcss-purgecss': {
      //   content: [
      //     'src/pages/**/*.vue',
      //     'src/layouts/**/*.vue',
      //     'src/components/**/*.vue',
      //     'src/assets/svg/**/*.svg'
      //   ],
      //   safelist: [
      //     'html', 'body', /^nuxt/, /js--/, /wb-/, /wb_/
      //   ]
      // },
      'rucksack-css': {},
      cssnano: {
        preset: [
          'default',
          {
            discardDuplicates: false,
            mergeRules: false
          }
        ]
      }
    },
    order: 'cssnanoLast'
  },

  critters: {
    config: {
      reduceInlineStyles: false,
      inlineFonts: true
    }
  },

  app: {
    baseURL: getBaseUrl(),
    head: {
      htmlAttrs: {
        lang: 'en'
      },
      title: 'Blue Might',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },

        {
          key: 'og:site_name',
          property: 'og:site_name',
          content: 'blue-might'
        },
        { key: 'og:type', property: 'og:type', content: 'website' },

        { name: 'title', content: 'Blue Might' },
        { name: 'description', content: 'Blue Might.' },
        // { name: 'description', content: '' },
        { key: 'og:title', property: 'og:title', content: 'Blue Might' },
        {
          name: 'og:description',
          content: 'Blue Might'
        },
        {
          key: 'og:url',
          property: 'og:url',
          content: joinURL(getWebsiteHost(), getBaseUrl())
        },

        {
          key: 'og:image',
          property: 'og:image',
          content: withHttps(
            joinURL(getWebsiteHost(), getBaseUrl(), 'share.jpg')
          )
        },
        {
          key: 'og:image:secure_url',
          property: 'og:image:secure_url',
          content: joinURL(getWebsiteHost(), getBaseUrl(), 'share.jpg')
        },
        { key: 'og:image:width', property: 'og:image:width', content: 1200 },
        { key: 'og:image:height', property: 'og:image:height', content: 630 },
        {
          key: 'og:image:type',
          property: 'og:image:type',
          content: 'image/jpeg'
        },
        { key: 'theme-color', name: 'theme-color', content: '#000000' }
      ]
    }
  },

  modules: [
    '@nuxt/eslint',
    '@nuxtjs/critters',
    [
      '@nuxtjs/sitemap',
      {
        xsl: false,
        path: 'sitemap.xml',
        hostname: joinURL(getWebsiteHost(), getBaseUrl()),
        cacheTime: 1000 * 60 * 15,
        gzip: false,
        exclude: [],
        routes: [],
        defaults: {
          changefreq: 'daily',
          priority: 1,
          lastmod: new Date(),
          lastmodrealtime: true
        }
      }
    ],
    [
      '@nuxtjs/robots',
      {
        UserAgent: '*',
        Disallow: '',
        Sitemap: joinURL(getWebsiteHost(), getBaseUrl(), 'sitemap.xml')
      }
    ]
  ],

  eslint: {
    checker: true
  },

  typescript: {
    tsConfig: {
      compilerOptions: {
        noUncheckedIndexedAccess: true
      },
      include: ['../../**/*']
    },
    typeCheck: true,
    strict: true
  }
});

function getBaseUrl() {
  return process.env.npm_config_base_url || process.env.BASE_URL || '/';
}

function getWebsiteHost() {
  return (
    process.env.npm_config_website_host ||
    process.env.WEBSITE_HOST ||
    'http://localhost:8050'
  );
}

function getHost() {
  return process.env.npm_config_host || process.env.HOST || 'localhost';
}

function getPort() {
  return Number(process.env.npm_config_port || process.env.PORT || 8050);
}

function getHttps() {
  if (existsSync('./.certs/cert.pem') && existsSync('./.certs/dev.pem')) {
    return {
      cert: './.certs/cert.pem',
      key: './.certs/dev.pem'
    };
  }
  return false;
}
