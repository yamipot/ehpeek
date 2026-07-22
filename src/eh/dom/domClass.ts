import {
  anchor,
  area,
  cell,
  cls,
  control,
  form,
  id,
  image,
  input,
  option,
  query,
  row,
  script,
  select,
  table,
  tag,
} from "./core";

export const sharedApply = {
  coverlessSearchGrid: "ehpeek-expand-coverless-search-grid",
  constrainResultsToViewport: "ehpeek-constrain-results-to-viewport",
  galleryTagMenuItem: "ehpeek-layout-gallery-tag-menu-item",
  hideOriginalSearchAction: "ehpeek-hide-original-search-action",
  searchGrid: "ehpeek-layout-search-grid",
  stackSearchGridTags: "ehpeek-stack-search-grid-tags",
} as const;

const page = {
  html: tag("html", {
    apply: {
      constrainResults: sharedApply.constrainResultsToViewport,
    },
  }),
  body: tag("body", {
    apply: {
      constrainFavoritesNavigation: "ehpeek-constrain-favorites-navigation",
      constrainResults: sharedApply.constrainResultsToViewport,
      hidePreviewPageBars: "ehpeek-hide-original-preview-page-bars",
    },
  }),
};

const common = {
  descendants: query("*"),
  galleryLink: anchor('a[href*="/g/"]'),
  image: image("img"),
  interactive: query(
    "a[href], button, input, select, textarea, label, [onclick]",
  ),
  links: anchor("a[href]"),
  scripts: script("script"),
};

const ehSyringe = {
  root: cls("ehs-injected"),
};

const myTags = {
  tags: id("usertags_outer", {
    childs: {
      items: query(":scope > [id^='usertag_']", {
        childs: {
          color: input("input[id^='tagcolor_']"),
          preview: query("[id^='tagpreview_'][title]"),
        },
      }),
    },
  }),
  options: option("#tagset_outer select option"),
  defaultColor: input("#tagcolor"),
  enabled: input("#tagset_enable"),
  favoriteOptions: input("input[name='favcat']"),
  favoriteOptionRow: query("div[style*='height']"),
};

const gallery = {
  actions: id("gd5", {
    apply: {
      expand: "ehpeek-expand-gallery-actions",
    },
    childs: {
      items: query("a, button, input[type='button'], input[type='submit']", {
        apply: {
          layout: "ehpeek-layout-gallery-action",
        },
      }),
    },
  }),
  comments: id("cdiv", {
    apply: {
      touchScore: "ehpeek-enable-touch-comment-score",
    },
    childs: {
      score: cls("c5"),
      scoreComment: cls("c1", {
        childs: {
          details: query(".c7[id^='cvotes_']"),
        },
      }),
    },
  }),
  imagePage: {
    image: image("img#img"),
    links: anchor("a[href]"),
  },
  info: {
    category: id("gdc", {
      childs: {
        appearance: query("[class*='ct']"),
      },
    }),
    cover: id("gd1", {
      childs: {
        image: image("img", {
          apply: {
            fit: "ehpeek-fit-gallery-cover",
          },
        }),
        descendants: query("*"),
      },
    }),
    details: id("gdd", {
      childs: {
        rows: row("tr", {
          childs: {
            cells: cell("td, th"),
          },
        }),
      },
    }),
    favorite: id("fav", {
      childs: {
        link: id("favoritelink"),
        titled: query("[title]"),
      },
    }),
    hostFallback: id("gleft"),
    original: id("gmid"),
    rating: {
      actions: area('map[name="rating"] area'),
      count: id("rating_count"),
      image: id("rating_image"),
      label: id("rating_label"),
      rated: query(".irb, .irg, .irr"),
    },
    tagMenu: id("tagmenu_act", {
      apply: {
        layout: "ehpeek-layout-gallery-tag-menu",
      },
      childs: {
        actions: anchor("a"),
      },
    }),
    newTag: id("tagmenu_new", {
      apply: {
        layout: "ehpeek-layout-new-tag-form",
      },
      childs: {
        button: control("#newtagbutton"),
        field: input("#newtagfield"),
        form: form("form"),
      },
    }),
    titleMain: id("gn"),
    titleSub: id("gj"),
    uploader: query("#gdn a, #gdn"),
  },
  preview: {
    description: cls("gpc"),
    imageLinks: anchor(
      "#gdt a[href], .gdtm a[href], .gdtl a[href], a[href*='/s/']",
    ),
    imageLinkHost: query("#gdt, .gdtm, .gdtl"),
    pageBarBottom: cls("ptb"),
    pageBarTop: cls("ptt"),
    thumbs: id("gdt", {
      apply: {
        suppressTapHighlight: "ehpeek-suppress-thumbnail-tap-highlight",
        swipe: "ehpeek-enable-preview-swipe-input",
      },
      childs: {
        images: image("img"),
        links: anchor("a[href]"),
      },
    }),
  },
  tagContainer: query("div.gt, div.gtl, div.gtw", {
    apply: {
      myTag: "ehpeek-color-my-tag",
    },
  }),
  tags: id("taglist", {
    childs: {
      links: anchor("a"),
      rows: row("tr", {
        childs: {
          namespace: query(".tc, td:first-child"),
          links: anchor("a"),
        },
      }),
    },
  }),
};

const search = {
  controls: query("#toppane, .searchtext, .searchwarn, .searchnav, .ptt, .ptb"),
  displayMode: select("select[onchange*='inline_set=dm_']", {
    childs: {
      options: option("option"),
    },
  }),
  favorites: {
    categories: query(".ido > .nosel", {
      apply: {
        hide: "ehpeek-hide-original-favorites-categories",
      },
      childs: {
        items: query(":scope > .fp, :scope > .fps", {
          childs: {
            indicator: cls("i"),
          },
        }),
      },
    }),
    input: input("input[name='f_search']"),
    selectedCategory: cls("fps"),
  },
  input: input("#f_search, input[name='f_search']", {
    apply: {
      expand: "ehpeek-expand-search-input",
    },
  }),
  navigation: cls("searchnav", {
    childs: {
      first: anchor("a[id$='first'][href]"),
      previous: anchor("a[id$='prev'][href]"),
      next: anchor("a[id$='next'][href]"),
      last: anchor("a[id$='last'][href]"),
      links: anchor("a[href]"),
    },
  }),
  navigationLink: anchor(
    ".searchnav a[id$='first'][href], .searchnav a[id$='prev'][href], .searchnav a[id$='next'][href], .searchnav a[id$='last'][href]",
  ),
  panel: {
    box: id("searchbox", {
      apply: {
        reset: "ehpeek-reset-search-box-layout",
      },
      childs: {
        advanced: id("advdiv", {
          apply: {
            expand: "ehpeek-expand-search-advanced-options",
          },
        }),
        categories: table("form > table", {
          apply: {
            layout: "ehpeek-layout-search-categories",
          },
        }),
        form: form("form", {
          apply: {
            stack: "ehpeek-stack-search-form",
          },
        }),
      },
    }),
    clear: control("input[name='f_clear'], button[name='f_clear']", {
      apply: {
        hide: sharedApply.hideOriginalSearchAction,
      },
    }),
    clearFallback: control("input[type='button'], button[type='button']", {
      apply: {
        hide: sharedApply.hideOriginalSearchAction,
      },
    }),
    fileSearch: id("fsdiv", {
      apply: {
        expand: "ehpeek-expand-file-search",
      },
    }),
    optionLinks: anchor("a"),
    submit: control("input[name='f_apply'], button[name='f_apply']", {
      apply: {
        hide: sharedApply.hideOriginalSearchAction,
      },
    }),
    submitFallback: control("input[type='submit'], button[type='submit']", {
      apply: {
        hide: sharedApply.hideOriginalSearchAction,
      },
    }),
  },
  rangeBar: id("rangebar"),
  removeHistory: control("[data-ehpeek-remove-history]"),
  results: cls("itg", {
    apply: {
      compactFavorites: "ehpeek-compact-all-favorites-results",
      containFavorites: "ehpeek-contain-favorites-results",
      containSearch: "ehpeek-contain-search-results",
      grid: sharedApply.searchGrid,
      swipe: "ehpeek-enable-search-swipe-input",
    },
    childs: {
      body: query(":scope > tbody"),
      rows: row("tbody > tr", {
        apply: {
          coverless: sharedApply.coverlessSearchGrid,
        },
        childs: {
          cover: query(":scope > .gl1e"),
          content: query(":scope > .gl2e", {
            childs: {
              detail: cls("gl4e", {
                childs: {
                  tags: query(":scope > *", {
                    apply: {
                      stack: sharedApply.stackSearchGridTags,
                    },
                  }),
                  title: query(":scope > .glink", {
                    apply: {
                      history: "ehpeek-prefix-read-history-label",
                    },
                  }),
                },
              }),
              metadata: cls("gl3e"),
            },
          }),
        },
      }),
      galleryLinks: anchor('a[href*="/g/"]'),
      links: anchor("a[href]"),
      titles: cls("glink", {
        apply: {
          history: "ehpeek-prefix-read-history-label",
        },
      }),
    },
  }),
  resultText: cls("searchtext"),
  submit: control("input[name='f_apply'], button[name='f_apply']"),
  submitFallback: control("input[type='submit'], button[type='submit']"),
};

const settings = {
  titleDefault: input("#tl_r"),
  titleJapanese: input("#tl_j"),
};

const topBar = {
  galleryTitle: query("#gd2, h1"),
  navigation: id("nb", {
    childs: {
      links: anchor("a[href]", {
        apply: {
          layout: "ehpeek-layout-top-bar-menu-item",
        },
      }),
    },
  }),
};

/** Original E-H structure and the named EhPeek classes allowed on each owned node. */
export const domClass = {
  common,
  ehSyringe,
  gallery,
  myTags,
  page,
  search,
  settings,
  topBar,
};
