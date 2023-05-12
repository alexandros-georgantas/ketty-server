/* Define language regex */

const { cloneDeep } = require('lodash')

// define list of valid language iso's
const languageList = [
  'aa',
  'ab',
  'ae',
  'af',
  'ak',
  'am',
  'an',
  'ar',
  'as',
  'av',
  'ay',
  'az',
  'az',
  'ba',
  'be',
  'bg',
  'bh',
  'bi',
  'bm',
  'bn',
  'bo',
  'br',
  'bs',
  'ca',
  'ce',
  'ch',
  'co',
  'cr',
  'cs',
  'cu',
  'cv',
  'cy',
  'da',
  'de',
  'dv',
  'dz',
  'ee',
  'el',
  'en',
  'eo',
  'es',
  'et',
  'eu',
  'fa',
  'ff',
  'fi',
  'fj',
  'fo',
  'fr',
  'fy',
  'ga',
  'gd',
  'gl',
  'gn',
  'gu',
  'gv',
  'ha',
  'he',
  'hi',
  'ho',
  'hr',
  'ht',
  'hu',
  'hy',
  'hz',
  'ia',
  'id',
  'ie',
  'ig',
  'ii',
  'ik',
  'io',
  'is',
  'it',
  'iu',
  'ja',
  'jv',
  'ka',
  'kg',
  'ki',
  'kj',
  'kk',
  'kl',
  'km',
  'kn',
  'ko',
  'kr',
  'ks',
  'ku',
  'kv',
  'kw',
  'ky',
  'la',
  'lb',
  'lg',
  'li',
  'ln',
  'lo',
  'lt',
  'lu',
  'lv',
  'mg',
  'mh',
  'mi',
  'mk',
  'ml',
  'mn',
  'mr',
  'ms',
  'mt',
  'my',
  'na',
  'nb',
  'nd',
  'ne',
  'ng',
  'nl',
  'nn',
  'no',
  'nr',
  'nv',
  'ny',
  'oc',
  'oj',
  'om',
  'or',
  'os',
  'pa',
  'pi',
  'pl',
  'ps',
  'pt',
  'qu',
  'rm',
  'rn',
  'ro',
  'ru',
  'rw',
  'sa',
  'sc',
  'sd',
  'se',
  'sg',
  'si',
  'sk',
  'sl',
  'sm',
  'sn',
  'so',
  'sq',
  'sr',
  'ss',
  'st',
  'su',
  'sv',
  'sw',
  'ta',
  'te',
  'tg',
  'th',
  'ti',
  'tk',
  'tl',
  'tn',
  'to',
  'tr',
  'ts',
  'tt',
  'tw',
  'ty',
  'ug',
  'uk',
  'ur',
  'uz',
  've',
  'vi',
  'vo',
  'wa',
  'wo',
  'xh',
  'yi',
  'yo',
  'za',
  'zh',
  'zu',
]

// put them all into a string separated by |
const languageString = languageList.join('|')
// and make a regular expression out of it
const langIsoRegex = ['^(', languageString, ')$'].join('')

/* Define language regex */

const schema = {
  array: {
    type: 'array',
  },
  arrayOfIds: {
    type: 'array',
    items: {
      type: 'string',
      format: 'uuid',
    },
    default: [],
  },
  arrayOfStrings: {
    type: 'array',
    items: {
      type: 'string',
    },
  },
  arrayOfStringsNotEmpty: {
    type: 'array',
    items: {
      type: 'string',
      minLength: 1,
    },
  },
  boolean: {
    type: 'boolean',
  },
  booleanDefaultFalse: {
    type: 'boolean',
    default: false,
  },
  booleanDefaultTrue: {
    type: 'boolean',
    default: true,
  },
  /*
    This will accept a js Date object, as well as a Date.toISOString() string.
    If the object is not valid, it will fail at the DATE type in the migration.

    TO DO
    Figure out if there is a way to make the wrong object fail
    on validation time.
  */
  date: {
    type: ['string', 'object'],
    // format: 'date-time',
    format: 'date',
  },
  email: {
    type: 'string',
    format: 'email',
  },
  foreignType: {
    type: 'string',
    enum: [
      'book',
      'bookCollection',
      'bookCollectionTranslation',
      'bookComponent',
      'bookComponentState',
      'bookComponentTranslation',
      'bookTranslation',
      'contributor',
      'division',
      'file',
      'language',
      'lock',
      'sponsor',
      'template',
    ],
  },
  id: {
    type: ['string', 'null'],
    format: 'uuid',
  },
  integerPositive: {
    type: 'integer',
    exclusiveMinimum: 0,
  },
  targetType: {
    type: 'string',
    enum: ['epub', 'pagedjs', 'vivliostyle'],
  },
  notesType: { type: 'string', enum: ['footnotes', 'endnotes', 'chapterEnd'] },
  language: {
    regexp: {
      pattern: langIsoRegex,
      flags: 'i',
    },
    // type: 'string',
    // pattern: langIsoRegex,
  },
  mimetype: {
    type: 'string',
    pattern:
      '^(application|audio|font|image|model|multipart|text|video)/[a-z0-9]+([-+.][a-z0-9]+)*$',
    // if you want to know why this is default, look at
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Complete_list_of_MIME_types
    default: 'application/octet-stream',
  },
  object: {
    type: 'object',
  },
  string: {
    type: ['string', 'null'],
  },
  stringNotEmpty: {
    type: 'string',
    minLength: 1,
  },
  uri: {
    type: 'string',
    format: 'uri-reference',
  },
  year: {
    // type: 'string',
    // pattern: '(19|20d{2})',
    type: 'integer',
    minimum: 1900,
    maximum: 2099,
  },
}

const applyListQueryOptions = async (query, options = {}) => {
  let q = cloneDeep(query)
  const { orderBy, ascending, page, pageSize, related } = options

  let ascendingValue
  if (ascending === true) ascendingValue = 'asc'
  if (ascending === false) ascendingValue = 'desc'
  if (orderBy) q = q.orderBy(orderBy, ascendingValue)

  if (
    (Number.isInteger(page) && !Number.isInteger(pageSize)) ||
    (!Number.isInteger(page) && Number.isInteger(pageSize))
  ) {
    throw new Error(
      'both page and pageSize integers needed for paginated results',
    )
  }

  if (Number.isInteger(page) && Number.isInteger(pageSize)) {
    if (page < 0) {
      throw new Error(
        'invalid index for page (page should be an integer and greater than or equal to 0)',
      )
    }

    if (pageSize <= 0) {
      throw new Error(
        'invalid size for pageSize (pageSize should be an integer and greater than 0)',
      )
    }

    q = q.page(page, pageSize)
  }

  if (related) {
    q = q.withGraphFetched(related)
  }

  const result = await q
  const { results, total } = result

  return {
    result: page !== undefined ? results : result,
    totalCount: total !== undefined ? total : result.length,
  }
}

module.exports = {
  schema,
  applyListQueryOptions,
}
