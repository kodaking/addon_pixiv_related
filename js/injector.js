(() => {
  chrome.runtime.onMessage.addListener((message) => {
    console.log("inject");

    // 変更処理
    main();
  });
}).call(this);

// ==================== きょうつう =========================
const useColorList = [];
const forEach = Array.prototype.forEach;
const filter = Array.prototype.filter;
const map = Array.prototype.map;
const getElements = (name, callback = null, target = null) => {

  const html = target ? target : document;

  if (callback) {
    forEach.call(html.getElementsByClassName(name), callback);
  } else {
    return html.getElementsByClassName(name);
  }
}
const createHtml = (text) => {
  const html = document.createElement('html');
  html.innerHTML = text;

  return html;
}

const objectForEach = (obj, callback) => {
  let i = 0;
  Object.keys(obj).forEach((key) => {
    callback(key, obj[key], i);
    ++i;
  });
};

const contains = (arr, value) => {
  return arr.indexOf(value) != -1;
};

/**
 * illust IDを取得する
 */
function getIllustId(url) {
  return new URL(url).searchParams.get('illust_id');
}

/**
 * 重複をさけて、色をランダムに作成する
 * ※
 */
function genelateColor() {
  while (true) {
    const color = `#${Math.floor(Math.random()*16777215).toString(16)}`;

    if (!contains(useColorList, color)) {
      // listに含まれていなければcolorを返す
      useColorList.push(color);
      return color;
    }
  }
}



// ======================書き換え処理 ===================

function main () {
  getElements("title", (e) => { e.innerHTML = "test";})

  const url = new URL(location.href);
  const page = url.searchParams.get('p');

  console.log(`current page = ${page}`);

  if (page) {
    // 検索ページの2番目以降

  } else {
    // 初回ページ

  }

  // illustの親タグの参照の関連性を持たせる
  const pageObject = getPageObject();

  const fetchPromises = map.call(pageObject.urls, (url) => {
    const id = getIllustId(url);
    return promiseFetchPage(id, url);
  });

  Promise.all(fetchPromises)
    .then((results) => {
      // ページ内のillustのhtml取得完了後
      // results =[{illustId, html}, ...]

      console.log(results);

      const promises = map.call(results, (result) => {
        const {illustId, html} = result;
        return promiseBindIdRelated(illustId, html);
      });

      return Promise.all(promises);
    })
    .then((results) => {
      // ページのキャプションから、リンクを取得完了
      // results = [{illustId, captionIds}, ...]

      const contents = {};
      forEach.call(results, (result) => {
        const {illustId, captionIds} = result;
        contents[illustId] = captionIds;
      });

      const trees = resolveRelation(contents);

      console.log(trees);

      objectForEach(trees, (name, tree, index) => {

        // treeに紐づく関連性が一つの場合は色を付けない
        if (tree.length <= 1) {
          return;
        } 

        // 同一treeには同一色をつける
        const color = genelateColor();
        forEach.call(tree, (id) => {
          const element = pageObject.elements[id];

          if (element) {
            element.style.backgroundColor = color;
          }
        });
      });

    })
    .catch((error) => {
      console.log("error\n" + error);
    });


}

/**
 * 使うデータをこの処理内で使いやすいようにobject化
 */
function getPageObject() {
  const pageObject = {
    elements:{},
    urls: []
  };

  const elements = getElements('_7IVJuWZ');

  forEach.call(elements, (element) => {
    const url = getElements('bBzsEVG', null, element)[0].href;
    const id = getIllustId(url);

    pageObject.elements[id] = element;
    pageObject.urls.push(url);
  });

  return pageObject;
}

/**
 * promiseでGETリクエストを実行
 */
function promiseFetchPage(illustId, url) {
  return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();

      request.open("GET", url);
      request.addEventListener("load", (event) => { 
        if (request.status === 200) {
          resolve({
            illustId,
            html: createHtml(request.response)
          });
        } else {
          reject({
            status: request.status
          });
        }
      });
      request.send();
  });
}

/**
 * 全イラストのキャプション取得から全リンクを抽出 => もとのIDに紐づくID一覧をセットする
 */
function promiseBindIdRelated(illustId, html) {

  return new Promise((resolve) => {
    let captionHtml;
    getElements('caption', (elements) => {
      captionHtml = createHtml(elements.innerHTML);
    }, html);

    const aTags = captionHtml.getElementsByTagName('a');
    const links = map.call(aTags, (tag) => {return tag.href;});
    const ids = map.call(links, (link) => { return getIllustId(link);});

    resolve({
      illustId,
      captionIds: filter.call(ids, (id) => {return id != null;})

    });
  });
}

/**
 * イラスト間の関連性をチェックして紐付けていく
 */
function resolveRelation(contents) {
  const relations = {};
  let i = 1;

  objectForEach(contents, (illusId, captionIds, index) => {
    let isAdded = false;

    objectForEach(relations, (treeKey, treeIds, treeIndex) => {

      for (let x = 0; x < treeIds.length; ++x) {

        const key = treeIds[x];
        const ids = contents[key];

        if (ids && contains(ids, illusId)) {
          console.log("関係性あり1");
          // 関係性あり1 : 追加
          relations[treeKey].push(illusId);
          isAdded = true;
          break;
        }

        if (contains(captionIds, key)) {
          console.log("関係性あり2");
          // 関係性あり2 : 追加
          relations[treeKey].push(illusId);
          isAdded = true;
          break;
        }
      }
    });

    if (!isAdded) {
      // ここまでに追加されなければ、新しいtreeを追加する
      relations[`tree${i}`] = [illusId];
      ++i;
    }
  });

  return relations;
}