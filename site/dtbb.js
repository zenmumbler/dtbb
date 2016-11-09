!function(exports){"use strict";function elem(sel,base){return void 0===base&&(base=document),base.querySelector(sel)}function elemList(sel,base){return void 0===base&&(base=document),[].slice.call(base.querySelectorAll(sel),0)}function makePlatformLookup(plats){for(var pl={},shift=0,_i=0,plats_1=plats;_i<plats_1.length;_i++){var p=plats_1[_i];pl[p.key]={key:p.key,label:p.label,mask:1<<shift},shift+=1}return pl}function maskForPlatformKeys(keys){return keys.reduce(function(mask,key){var plat=Platforms[key];return mask|(plat?plat.mask:0)},0)}function intersectSet(a,b){var tiny,large,intersection=new Set;return a.size<b.size?(_a=[a,b],tiny=_a[0],large=_a[1]):(_b=[b,a],tiny=_b[0],large=_b[1]),tiny.forEach(function(val){large.has(val)&&intersection.add(val)}),intersection;var _a,_b}function mergeSet(dest,source){source.forEach(function(val){return dest.add(val)})}function newSetFromArray(source){for(var set=new Set,len=source.length,vi=0;vi<len;++vi)set.add(source[vi]);return set}function arrayFromSet(source){var arr=[];return source.forEach(function(val){return arr.push(val)}),arr}function loadTypedJSON(url){return new Promise(function(resolve,reject){var xhr=new XMLHttpRequest;xhr.open("GET",url),xhr.overrideMimeType("application/json"),xhr.responseType="json",xhr.onload=function(){resolve(xhr.response)},xhr.onerror=reject,xhr.send(null)})}function makeDocID(issue,entryIndex){return issue<<16|entryIndex}function watchableBinding(w,elemOrSel,context){var elems="string"==typeof elemOrSel?[].slice.call((context||document).querySelectorAll(elemOrSel)):Array.isArray(elemOrSel)?elemOrSel:[elemOrSel];return new WatchableInputBinding(w,elems)}var Platforms=makePlatformLookup([{key:"desktop",label:"Desktop"},{key:"win",label:"Windows"},{key:"mac",label:"MacOS"},{key:"linux",label:"Linux"},{key:"web",label:"Web"},{key:"java",label:"Java"},{key:"vr",label:"VR"},{key:"mobile",label:"Mobile"}]),IssueThemeNames={15:"Caverns",16:"Exploration",17:"Islands",18:"Enemies as Weapons",19:"Discovery",20:"It’s Dangerous to go Alone! Take this!",21:"Escape",22:"Alone",23:"Tiny World",24:"Evolution",25:"You are the Villain",26:"Minimalism",27:"10 Seconds",28:"You Only Get One",29:"Beneath the Surface",30:"Connected Worlds",31:"Entire Game on One Screen",32:"An Unconventional Weapon",33:"You are the Monster",34:"Two Button Controls, Growing",35:"Shapeshift",36:"Ancient Technology",37:"?"},WatchableValue=function(){function WatchableValue(initial){this.watchers_=[],this.purgeableWatchers_=[],this.notifying_=!1,this.value_=initial}return WatchableValue.prototype.watch=function(watcher){this.watchers_.indexOf(watcher)===-1&&this.watchers_.push(watcher)},WatchableValue.prototype.unwatch=function(watcher){var watcherIndex=this.watchers_.indexOf(watcher);watcherIndex!==-1&&(this.notifying_?this.purgeableWatchers_.push(watcher):this.watchers_.splice(watcherIndex,1))},WatchableValue.prototype.notify=function(){this.notifying_=!0,this.purgeableWatchers_=[];for(var _i=0,_a=this.watchers_;_i<_a.length;_i++){var w=_a[_i];w(this.value_)}this.notifying_=!1;for(var _b=0,_c=this.purgeableWatchers_;_b<_c.length;_b++){var pw=_c[_b];this.unwatch(pw)}},WatchableValue.prototype.get=function(){return this.value_},WatchableValue.prototype.set=function(newValue){this.value_=newValue,this.notify()},WatchableValue.prototype.changed=function(){this.notify()},Object.defineProperty(WatchableValue.prototype,"watchable",{get:function(){return this},enumerable:!0,configurable:!0}),WatchableValue}(),PromiseDB=function(){function PromiseDB(name,version,upgrade){this.db_=this.request(indexedDB.open(name,version),function(openReq){openReq.onupgradeneeded=function(upgradeEvt){var db=openReq.result;upgrade(db,upgradeEvt.oldVersion,upgradeEvt.newVersion||version)}}).catch(function(error){console.warn("Failed to open / upgrade database '"+name+"'",error)}),this.tctx_={request:this.request.bind(this),cursor:this.cursor.bind(this),keyCursor:this.keyCursor.bind(this),getAll:this.getAll.bind(this),getAllKeys:this.getAllKeys.bind(this)}}return PromiseDB.prototype.close=function(){this.db_.then(function(db){db.close()})},PromiseDB.prototype.transaction=function(storeNames,mode,fn){var _this=this;return this.db_.then(function(db){return new Promise(function(resolve,reject){var tr=db.transaction(storeNames,mode);tr.onerror=function(){reject(tr.error||"transaction failed")},tr.onabort=function(){reject("aborted")};var result=fn(tr,_this.tctx_);tr.oncomplete=function(){resolve(void 0===result?void 0:result)}})})},PromiseDB.prototype.request=function(req,fn){var reqProm=new Promise(function(resolve,reject){req.onerror=function(){reject(req.error||"request failed")},req.onsuccess=function(){resolve(req.result)},fn&&fn(req)});return this.db_?this.db_.then(function(){return reqProm}):reqProm},PromiseDB.prototype.cursorImpl=function(cursorReq){var result={next:function(callback){return this.callbackFn_=callback,this},complete:function(callback){return this.completeFn_=callback,this},catch:function(callback){return this.errorFn_=callback,this}};return cursorReq.onerror=function(){result.errorFn_&&result.errorFn_(cursorReq.error)},cursorReq.onsuccess=function(){var cursor=cursorReq.result;cursor?result.callbackFn_&&result.callbackFn_(cursor):result.completeFn_&&result.completeFn_()},result},PromiseDB.prototype.cursor=function(container,range,direction){var cursorReq=container.openCursor(range,direction);return this.cursorImpl(cursorReq)},PromiseDB.prototype.keyCursor=function(index,range,direction){var cursorReq=index.openKeyCursor(range,direction);return this.cursorImpl(cursorReq)},PromiseDB.prototype.getAll=function(container,range,direction,limit){var _this=this;return new Promise(function(resolve,reject){var result=[];_this.cursor(container,range,direction).next(function(cur){result.push(cur.value),limit&&result.length===limit?resolve(result):cur.continue()}).complete(function(){resolve(result)}).catch(function(error){reject(error)})})},PromiseDB.prototype.getAllKeys=function(container,range,direction,limit){var _this=this;return new Promise(function(resolve,reject){var result=[];_this.keyCursor(container,range,direction).next(function(cur){result.push(cur.key),limit&&result.length===limit?resolve(result):cur.continue()}).complete(function(){resolve(result)}).catch(function(error){reject(error)})})},PromiseDB}(),CatalogPersistence=function(){function CatalogPersistence(){this.db_=new PromiseDB("dtbb",1,function(db,_oldVersion,_newVersion){console.info("Creating stores and indexes...");var headers=db.createObjectStore("headers",{keyPath:"issue"}),textindexes=db.createObjectStore("textindexes",{keyPath:"issue"}),entries=db.createObjectStore("entries",{keyPath:"docID"});headers.createIndex("issue","issue",{unique:!0}),textindexes.createIndex("issue","issue",{unique:!0}),entries.createIndex("issue","ld_issue"),entries.createIndex("category","category"),entries.createIndex("platform","platforms",{multiEntry:!0})})}return CatalogPersistence.prototype.saveCatalog=function(catalog,indEntries,sti){var header={issue:catalog.issue,theme:catalog.theme,stats:catalog.stats,savedAt:new Date};return this.db_.transaction(["headers","entries","textindexes"],"readwrite",function(tr,_a){var request=_a.request;console.info("Storing issue "+header.issue+" with "+indEntries.length+" entries and textindex");var headers=tr.objectStore("headers"),entries=tr.objectStore("entries"),textindexes=tr.objectStore("textindexes");request(headers.put(header));var textIndex={issue:catalog.issue,data:sti};request(textindexes.put(textIndex));for(var _i=0,indEntries_1=indEntries;_i<indEntries_1.length;_i++){var entry=indEntries_1[_i];request(entries.put(entry))}}).catch(function(error){throw console.warn("Error saving catalog "+catalog.issue,error),error})},CatalogPersistence.prototype.saveCatalogTextIndex=function(issue,sti){var data={issue:issue,data:sti};return this.db_.transaction("textindexes","readwrite",function(tr,_a){var request=_a.request,textindexes=tr.objectStore("textindexes");request(textindexes.put(data))}).catch(function(error){throw console.warn("Error saving textindex: ",error),error})},CatalogPersistence.prototype.persistedIssues=function(){return this.db_.transaction("headers","readonly",function(tr,_a){var getAllKeys=_a.getAllKeys,issueIndex=tr.objectStore("headers").index("issue");return getAllKeys(issueIndex,void 0,"nextunique")}).catch(function(){return[]})},CatalogPersistence.prototype.loadCatalog=function(issue){return this.db_.transaction(["headers","entries","textindexes"],"readonly",function(tr,_a){var request=_a.request,getAll=_a.getAll,headerP=request(tr.objectStore("headers").get(issue)),issueIndex=tr.objectStore("entries").index("issue"),entriesP=getAll(issueIndex,issue),ptiP=request(tr.objectStore("textindexes").get(issue));return Promise.all([headerP,entriesP,ptiP]).then(function(result){var pti=result[2];return{header:result[0],entries:result[1],sti:pti&&pti.data}})}).catch(function(){return null})},CatalogPersistence.prototype.destroyCatalog=function(issue){return this.db_.transaction(["headers","entries","textindexes"],"readwrite",function(tr,_a){var request=_a.request,getAllKeys=_a.getAllKeys,headers=tr.objectStore("headers"),entries=tr.objectStore("entries"),issueIndex=entries.index("issue"),indexes=tr.objectStore("textindexes");getAllKeys(issueIndex,issue).then(function(entryKeys){for(var _i=0,entryKeys_1=entryKeys;_i<entryKeys_1.length;_i++){var key=entryKeys_1[_i];request(entries.delete(key))}}),request(headers.delete(issue)),request(indexes.delete(issue))})},CatalogPersistence.prototype.purgeAll=function(){var _this=this;return this.persistedIssues().then(function(issues){return Promise.all(issues.map(function(issue){return _this.destroyCatalog(issue)}))})},CatalogPersistence}(),DiacriticCharMapping={"À":"A","Á":"A","Â":"A","Ã":"A","Ä":"A","Å":"A","Ç":"C","È":"E","É":"E","Ê":"E","Ë":"E","Ì":"I","Í":"I","Î":"I","Ï":"I","Ñ":"N","Ò":"O","Ó":"O","Ô":"O","Õ":"O","Ö":"O","Ø":"O","Ù":"U","Ú":"U","Û":"U","Ü":"U","Ý":"Y","ß":"ss","à":"a","á":"a","â":"a","ã":"a","ä":"a","å":"a","ç":"c","è":"e","é":"e","ê":"e","ë":"e","ì":"i","í":"i","î":"i","ï":"i","ñ":"n","ò":"o","ó":"o","ô":"o","õ":"o","ö":"o","ø":"o","ù":"u","ú":"u","û":"u","ü":"u","ý":"y","ÿ":"y"},InvalidCharsMatcher=/[^a-zA-Z0-9ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝßàáâãäåçèéêëìíîïñòóôõöøùúûüýÿ]/g,DiacriticsMatcher=/[ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝßàáâãäåçèéêëìíîïñòóôõöøùúûüýÿ]/,DiacriticCharMatchers={};Object.keys(DiacriticCharMapping).forEach(function(c){return DiacriticCharMatchers[c]=new RegExp(c,"g")});var TextIndex=function(){function TextIndex(){this.data_=new Map,this.wordNGramCache_=new Map,this.MIN_NGRAM_LENGTH=2,this.MAX_NGRAM_LENGTH=12,this.collapsedPunctuationMatcher=/['-]/g,this.multipleSpacesMatcher=/ +/g}return TextIndex.prototype.export=function(){var json={};return this.data_.forEach(function(indexes,key){var flatIndexes=[];indexes.forEach(function(index){return flatIndexes.push(index)}),json[key]=flatIndexes}),json},TextIndex.prototype.import=function(index){var _this=this;if(index instanceof TextIndex)index.data_.forEach(function(indexes,key){_this.data_.has(key)?mergeSet(_this.data_.get(key),indexes):_this.data_.set(key,indexes)});else for(var key in index)this.data_.has(key)?mergeSet(this.data_.get(key),index[key]):this.data_.set(key,newSetFromArray(index[key]))},Object.defineProperty(TextIndex.prototype,"ngramCount",{get:function(){return this.data_.size},enumerable:!0,configurable:!0}),TextIndex.prototype.wordNGrams=function(word){if(this.wordNGramCache_.has(word))return this.wordNGramCache_.get(word);for(var wordLen=word.length,ngrams=new Set,l=this.MIN_NGRAM_LENGTH;l<=this.MAX_NGRAM_LENGTH&&!(l>wordLen);++l)for(var maxO=wordLen-l,o=0;o<=maxO;++o){var ss=word.substr(o,l);ngrams.has(ss)||ngrams.add(ss)}return this.wordNGramCache_.set(word,ngrams),ngrams},TextIndex.prototype.stripDiacritics=function(term){for(var r;r=term.match(DiacriticsMatcher);){var mc=term[r.index];term=term.replace(DiacriticCharMatchers[mc],DiacriticCharMapping[mc])}return term},TextIndex.prototype.tokenizeString=function(s){var cs=s.toLowerCase().replace(this.collapsedPunctuationMatcher,"").replace(InvalidCharsMatcher," ").replace(this.multipleSpacesMatcher," ").trim(),tokens=cs.split(" ");return newSetFromArray(tokens)},TextIndex.prototype.indexRawString=function(rs,ref){var _this=this,boxedRef=[ref],tokenSet=this.tokenizeString(rs);tokenSet.forEach(function(token){token=_this.stripDiacritics(token);var ngrams=_this.wordNGrams(token);ngrams.forEach(function(ngram){_this.data_.has(ngram)?_this.data_.get(ngram).add(ref):_this.data_.set(ngram,newSetFromArray(boxedRef))})})},TextIndex.prototype.query=function(qs){var _this=this,qt=this.tokenizeString(qs),termIndexSets=[],hasEmptyResult=!1;if(qt.forEach(function(term){term.length<_this.MIN_NGRAM_LENGTH||(term.length>_this.MAX_NGRAM_LENGTH&&(term=term.substr(0,_this.MAX_NGRAM_LENGTH)),term=_this.stripDiacritics(term),_this.data_.has(term)?termIndexSets.push(_this.data_.get(term)):hasEmptyResult=!0)}),hasEmptyResult)return new Set;if(0==termIndexSets.length)return null;termIndexSets.sort(function(a,b){return a.size<b.size?-1:1});for(var result=new Set(termIndexSets[0]),tisix=1;tisix<termIndexSets.length;++tisix)result=intersectSet(result,termIndexSets[tisix]);return result},TextIndex}(),IndexerAPI=function(){function IndexerAPI(){var _this=this;this.promFuncs_=new Map,this.nextIndex_=0,this.worker_=new Worker("task_indexer.js"),this.worker_.onerror=function(event){console.warn("An internal error occurred inside the indexer task: "+event.error+" @ "+event.lineno+":"+event.colno)},this.worker_.onmessage=function(event){var response=event.data;if(response&&"string"==typeof response.status&&"number"==typeof response.reqIndex){var funcs=_this.promFuncs_.get(response.reqIndex);funcs?"status"===response.status?funcs.progress&&funcs.progress(response.progress):("success"===response.status?funcs.resolve(response):"error"===response.status&&funcs.reject(response),_this.promFuncs_.delete(response.reqIndex)):console.warn("IndexerAPI: Cannot find the functions for request #"+response.reqIndex)}else console.warn("IndexerAPI: Got an invalid response from the server: "+response)}}return IndexerAPI.prototype.promisedCall=function(req,progress){var _this=this;return new Promise(function(resolve,reject){_this.promFuncs_.set(req.reqIndex,{resolve:resolve,reject:reject,progress:progress}),_this.worker_.postMessage(req)})},IndexerAPI.prototype.open=function(){this.nextIndex_+=1;var req={what:"open",reqIndex:this.nextIndex_};return this.promisedCall(req)},IndexerAPI.prototype.index=function(issue,progress){this.nextIndex_+=1;var req={what:"index",reqIndex:this.nextIndex_,issue:issue};return this.promisedCall(req,progress)},IndexerAPI}(),CatalogIndexer=function(){function CatalogIndexer(persist_,mode){var _this=this;this.persist_=persist_,"worker"===mode&&(this.api_=new IndexerAPI,this.api_.open().catch(function(){console.warn("Got a failure when trying to connect to Indexer API, disabling"),_this.api_=void 0}))}return CatalogIndexer.prototype.acceptCatalogData=function(catalog){for(var entries=catalog.entries.map(function(entry){var indEntry=entry;return indEntry.indexes={platformMask:0},indEntry}),count=entries.length,textIndex=new TextIndex,entryIndex=0;entryIndex<count;++entryIndex){var entry=entries[entryIndex],docID=makeDocID(catalog.issue,entryIndex);entry.docID=docID,entry.indexes.platformMask=maskForPlatformKeys(entry.platforms),textIndex.indexRawString(entry.title,docID),textIndex.indexRawString(entry.author.name,docID),textIndex.indexRawString(entry.description,docID);for(var _i=0,_a=entry.links;_i<_a.length;_i++){var link=_a[_i];textIndex.indexRawString(link.label,docID)}this.onProgress&&this.onProgress(entryIndex,count)}return this.storeCatalog(catalog,entries,textIndex),{entries:entries,textIndex:textIndex}},CatalogIndexer.prototype.storeCatalog=function(catalog,indexedEntries,textIndex){this.persist_.saveCatalog(catalog,indexedEntries,textIndex.export()).then(function(){console.info("saved issue "+catalog.issue)})},CatalogIndexer.prototype.importCatalogFile=function(issue,progress){var _this=this;if(this.api_)return this.api_.index(issue,progress).then(function(response){var textIndex=new TextIndex;return textIndex.import(response.textIndex),{entries:response.entries,textIndex:textIndex}});var revision=1,extension="zenmumbler.net"!==location.host.toLowerCase()?".json":".gzjson",entriesURL="data/ld"+issue+"_entries"+extension+"?"+revision;return location.pathname.indexOf("/workers")>-1&&(entriesURL="../"+entriesURL),loadTypedJSON(entriesURL).then(function(catalog){return _this.acceptCatalogData(catalog)})},CatalogIndexer}(),CatalogStore=function(){function CatalogStore(state_){var _this=this;this.state_=state_,this.plasticSurge_=new TextIndex,this.entryData_=new Map,this.allSet_=new Set,this.compoFilter_=new Set,this.jamFilter_=new Set,this.platformFilters_=new Map,this.issueFilters_=new Map;var isMobile=null!==navigator.userAgent.toLowerCase().match(/android|iphone|ipad|ipod|windows phone/);this.persist_=new CatalogPersistence,this.indexer_=new CatalogIndexer(this.persist_,isMobile?"local":"worker"),this.loadedIssues_=new Set;for(var pk in Platforms)this.platformFilters_.set(Platforms[pk].mask,new Set);this.filteredSet_=new WatchableValue(new Set),this.loading_=new WatchableValue((!1)),this.loadingRatio_=new WatchableValue(0),state_.query.watch(function(_){return _this.filtersChanged()}),state_.category.watch(function(_){return _this.filtersChanged()}),state_.platform.watch(function(_){return _this.filtersChanged()}),state_.issue.watch(function(issue){return _this.issueChanged(issue)})}return CatalogStore.prototype.filtersChanged=function(){var restrictionSets=[],query=this.state_.query.get(),category=this.state_.category.get(),platform=this.state_.platform.get(),issue=this.state_.issue.get();if(query.length>0){var textFilter=this.plasticSurge_.query(query);textFilter&&restrictionSets.push(textFilter)}"compo"===category?restrictionSets.push(this.compoFilter_):"jam"===category&&restrictionSets.push(this.jamFilter_);for(var pk in Platforms){var plat=Platforms[pk];platform&plat.mask&&restrictionSets.push(this.platformFilters_.get(plat.mask))}var issueSet=this.issueFilters_.get(issue);issueSet&&restrictionSets.push(issueSet);var resultSet;if(0===restrictionSets.length)resultSet=this.allSet_;else{restrictionSets.sort(function(a,b){return a.size<b.size?-1:1}),resultSet=new Set(restrictionSets[0]);for(var tisix=1;tisix<restrictionSets.length;++tisix)resultSet=intersectSet(resultSet,restrictionSets[tisix])}this.filteredSet_.set(resultSet)},CatalogStore.prototype.issueChanged=function(newIssue){var _this=this;if(this.loadedIssues_.has(newIssue))console.info("Already have this issue "+newIssue+" loaded"),this.filtersChanged();else{this.loadingRatio_.set(0),this.loading_.set(!0);var finished_1=function(entries,textIndex){_this.acceptIndexedEntries(entries,textIndex),_this.loadingRatio_.set(1),_this.loading_.set(!1)},loadRemote_1=function(){_this.indexer_.importCatalogFile(newIssue,function(ratio){_this.loadingRatio_.set(ratio)}).then(function(data){finished_1(data.entries,data.textIndex)})};this.persist_.persistedIssues().then(function(issues){console.info("Checking persisted issues: "+issues),issues.indexOf(newIssue)>-1?_this.persist_.loadCatalog(newIssue).then(function(catalog){console.info("Got catalog from local DB"),catalog&&catalog.header&&catalog.entries&&catalog.sti&&catalog.entries.length===catalog.header.stats.entries?(console.info("Catalog looks good, loading entries and textindex"),finished_1(catalog.entries,catalog.sti)):(console.info("Catalog data smelled funny, fall back to network load."),loadRemote_1())}):(console.info("No entries available locally, fall back to network load."),loadRemote_1())})}},CatalogStore.prototype.acceptIndexedEntries=function(entries,textIndex){this.entryData_=new Map,this.allSet_=new Set,this.compoFilter_=new Set,this.jamFilter_=new Set;for(var pk in Platforms){var plat=Platforms[pk];this.platformFilters_.set(plat.mask,new Set)}var issueSet,updateIssueSet=!1;entries.length>0&&(issueSet=this.issueFilters_.get(entries[0].ld_issue)),issueSet||(issueSet=new Set,updateIssueSet=!0);for(var _i=0,entries_1=entries;_i<entries_1.length;_i++){var entry=entries_1[_i],docID=entry.docID;this.entryData_.set(docID,entry),this.allSet_.add(docID),updateIssueSet&&issueSet.add(docID);for(var pk in Platforms){var plat=Platforms[pk];entry.indexes.platformMask&plat.mask&&this.platformFilters_.get(plat.mask).add(docID)}"compo"===entry.category?this.compoFilter_.add(docID):this.jamFilter_.add(docID)}this.plasticSurge_=new TextIndex,this.plasticSurge_.import(textIndex),this.filtersChanged()},Object.defineProperty(CatalogStore.prototype,"filteredSet",{get:function(){return this.filteredSet_.watchable},enumerable:!0,configurable:!0}),Object.defineProperty(CatalogStore.prototype,"loading",{get:function(){return this.loading_.watchable},enumerable:!0,configurable:!0}),Object.defineProperty(CatalogStore.prototype,"loadingRatio",{get:function(){return this.loadingRatio_.watchable},enumerable:!0,configurable:!0}),Object.defineProperty(CatalogStore.prototype,"entries",{get:function(){return this.entryData_},enumerable:!0,configurable:!0}),CatalogStore}(),GamesBrowserState=function(){function GamesBrowserState(){this.platformMask_=new WatchableValue(0),this.category_=new WatchableValue(""),this.query_=new WatchableValue(""),this.issue_=new WatchableValue(0),this.catalogStore_=new CatalogStore(this)}return Object.defineProperty(GamesBrowserState.prototype,"query",{get:function(){return this.query_.watchable},enumerable:!0,configurable:!0}),Object.defineProperty(GamesBrowserState.prototype,"category",{get:function(){return this.category_.watchable},enumerable:!0,configurable:!0}),Object.defineProperty(GamesBrowserState.prototype,"platform",{get:function(){return this.platformMask_.watchable},enumerable:!0,configurable:!0}),Object.defineProperty(GamesBrowserState.prototype,"issue",{get:function(){return this.issue_.watchable},enumerable:!0,configurable:!0}),GamesBrowserState.prototype.setQuery=function(q){this.query_.set(q)},GamesBrowserState.prototype.setCategory=function(c){this.category_.set(c)},GamesBrowserState.prototype.setPlatform=function(p){this.platformMask_.set(p)},GamesBrowserState.prototype.setIssue=function(newIssue){newIssue!==this.issue_.get()&&newIssue in IssueThemeNames&&this.issue_.set(newIssue)},Object.defineProperty(GamesBrowserState.prototype,"filteredSet",{get:function(){return this.catalogStore_.filteredSet},enumerable:!0,configurable:!0}),Object.defineProperty(GamesBrowserState.prototype,"loading",{get:function(){return this.catalogStore_.loading},enumerable:!0,configurable:!0}),Object.defineProperty(GamesBrowserState.prototype,"loadingRatio",{get:function(){return this.catalogStore_.loadingRatio},enumerable:!0,configurable:!0}),Object.defineProperty(GamesBrowserState.prototype,"entries",{get:function(){return this.catalogStore_.entries},enumerable:!0,configurable:!0}),GamesBrowserState}(),GamesGrid=function(){function GamesGrid(containerElem_,state_){var _this=this;this.containerElem_=containerElem_,this.state_=state_,this.rows_=0,this.cols_=0,this.gridOffsetX=20,this.gridOffsetY=20,this.cellWidth_=392,this.cellHeight_=122,this.cellMargin_=24,this.entryCount_=0,this.activeList_=[],this.cells_=[],this.entryTemplate_=elem("#entry"),this.scrollOffset_=0,this.firstVisibleRow_=0,this.scrollingElem_=containerElem_.parentElement,this.scrollingElem_.onscroll=function(evt){_this.scrollPosChanged(evt.target.scrollTop)},state_.filteredSet.watch(function(filteredSet){_this.activeSetChanged(filteredSet)}),window.onresize=function(){_this.resized()},this.resized()}return GamesGrid.prototype.activeSetChanged=function(newActiveSet){this.entryCount_=newActiveSet.size,this.activeList_=arrayFromSet(newActiveSet),this.relayout()},GamesGrid.prototype.makeCell=function(){for(var tile=this.entryTemplate_.content.cloneNode(!0).firstElementChild,pills=[],_i=0,_a=elemList(".pills span",tile);_i<_a.length;_i++){var pill=_a[_i];pills[parseInt(pill.dataset.mask)]=pill}var cell={tile:tile,link:tile.querySelector("a"),thumb:tile.querySelector(".thumb"),title:tile.querySelector("h2"),author:tile.querySelector("p.author span"),pills:pills,position:-1,docID:-1,hidden:!1};return this.containerElem_.appendChild(tile),cell},GamesGrid.prototype.pixelPositionForCellPosition=function(cellPos){var cellRow=Math.floor(cellPos/this.cols_),cellCol=cellPos%this.cols_;return{left:this.gridOffsetX+cellCol*(this.cellWidth_+this.cellMargin_),top:this.gridOffsetY+cellRow*(this.cellHeight_+this.cellMargin_)}},GamesGrid.prototype.ensureCellCount=function(cellCount){if(cellCount<this.cells_.length)for(var doomed=this.cells_.splice(cellCount),_i=0,doomed_1=doomed;_i<doomed_1.length;_i++){var c=doomed_1[_i];this.containerElem_.removeChild(c.tile),c.position=-1,c.docID=-1}else for(var position=this.cells_.length?this.cells_[this.cells_.length-1].position:-1;this.cells_.length<cellCount;){position+=1;var cell=this.makeCell();cell.position=position,this.cells_.push(cell)}},GamesGrid.prototype.setCellPosition=function(cell,newPosition){if(cell.position=newPosition,newPosition>=this.entryCount_)return cell.tile.style.display="none",void(cell.hidden=!0);cell.hidden&&(cell.hidden=!1,cell.tile.style.display="");var cellPixelPos=this.pixelPositionForCellPosition(newPosition);cell.tile.style.left=cellPixelPos.left+"px",cell.tile.style.top=cellPixelPos.top+"px";var docID=this.activeList_[newPosition];if(cell.docID!=docID){cell.docID=docID;var entry=this.state_.entries.get(docID);if(cell.tile.dataset.docId=""+docID,console.assert(entry,"No entry for docID "+docID),entry){cell.link.href=entry.entry_url,cell.link.className=entry.category,cell.thumb.style.backgroundImage="url("+entry.thumbnail_url+")",cell.title.textContent=entry.title,cell.author.textContent=entry.author.name;for(var platKey in Platforms){var plat=Platforms[platKey],entryInMask=0!==(entry.indexes.platformMask&plat.mask);cell.pills[plat.mask].style.display=entryInMask?"":"none"}}}},GamesGrid.prototype.relayout=function(){this.containerElem_.style.height=2*this.gridOffsetY+Math.ceil(this.entryCount_/this.cols_)*(this.cellHeight_+this.cellMargin_)+"px",this.scrollOffset_=this.scrollingElem_.scrollTop;for(var effectiveOffset=Math.max(0,this.scrollOffset_-this.gridOffsetY),effectiveCellHeight=this.cellHeight_+this.cellMargin_,firstViewRow=Math.floor(effectiveOffset/effectiveCellHeight),position=firstViewRow*this.cols_,_i=0,_a=this.cells_;_i<_a.length;_i++){var cell=_a[_i];this.setCellPosition(cell,position),position+=1}},GamesGrid.prototype.moveCells=function(cellsToMove,positionOffset){for(var c=0;c<cellsToMove.length;++c){var cell=cellsToMove[c];this.setCellPosition(cell,cell.position+positionOffset)}},GamesGrid.prototype.moveRowsDown=function(rowCount){var positionOffset=this.cells_.length,cellsToMove=this.cells_.splice(0,rowCount*this.cols_);this.moveCells(cellsToMove,positionOffset),this.cells_=this.cells_.concat(cellsToMove),this.firstVisibleRow_+=rowCount},GamesGrid.prototype.moveRowsUp=function(rowCount){var positionOffset=-this.cells_.length,cellsToMove=this.cells_.splice((this.rows_-rowCount)*this.cols_);this.moveCells(cellsToMove,positionOffset),this.cells_=cellsToMove.concat(this.cells_),this.firstVisibleRow_-=rowCount},GamesGrid.prototype.scrollPosChanged=function(newScrollPos){this.scrollOffset_=newScrollPos;var effectiveOffset=Math.max(0,this.scrollOffset_-this.gridOffsetY),effectiveCellHeight=this.cellHeight_+this.cellMargin_,firstViewRow=Math.floor(effectiveOffset/effectiveCellHeight),rowDiff=Math.abs(firstViewRow-this.firstVisibleRow_);rowDiff>=this.rows_?(this.moveCells(this.cells_,(firstViewRow-this.firstVisibleRow_)*this.cols_),this.firstVisibleRow_=firstViewRow):firstViewRow>this.firstVisibleRow_?this.moveRowsDown(rowDiff):firstViewRow<this.firstVisibleRow_&&this.moveRowsUp(rowDiff)},GamesGrid.prototype.dimensionsChanged=function(newCols,newRows){if(this.cols_!=newCols||this.rows_!=newRows)this.cols_=newCols,this.rows_=newRows,this.ensureCellCount(this.rows_*this.cols_),this.relayout();else{var newScrollOffset=this.scrollingElem_.scrollTop;newScrollOffset!=this.scrollOffset_&&this.scrollPosChanged(newScrollOffset)}},GamesGrid.prototype.resized=function(){var OVERFLOW_ROWS=6,width=this.scrollingElem_.offsetWidth-this.gridOffsetX-4,height=this.scrollingElem_.offsetHeight-this.gridOffsetY,cols=Math.floor(width/(this.cellWidth_+this.cellMargin_)),rows=Math.ceil(height/(this.cellHeight_+this.cellMargin_))+OVERFLOW_ROWS;this.dimensionsChanged(cols,rows)},GamesGrid}(),WatchableInputBinding=function(){function WatchableInputBinding(watchable_,elems_){var _this=this;this.watchable_=watchable_,this.elems_=elems_;for(var _i=0,elems_1=elems_;_i<elems_1.length;_i++){var elem=elems_1[_i];this.bindElement(elem)}watchable_.watch(function(newVal){_this.acceptChange(newVal)})}return WatchableInputBinding.prototype.broadcast=function(fn){return this.broadcastFn_=fn,this},WatchableInputBinding.prototype.accept=function(fn){return this.acceptFn_=fn,this},WatchableInputBinding.prototype.get=function(fn){return this.getFn_=fn,this},WatchableInputBinding.prototype.set=function(fn){return this.setFn_=fn,this},WatchableInputBinding.prototype.broadcastChange=function(newValue){this.broadcastFn_&&this.broadcastFn_(newValue)},WatchableInputBinding.prototype.acceptChange=function(newValue){if(this.acceptFn_)this.acceptFn_(newValue);else for(var watchableValue=String(newValue),_i=0,_a=this.elems_;_i<_a.length;_i++){var elem=_a[_i],currentValue=this.getElementValue(elem);watchableValue!==currentValue&&this.setElementValue(elem,newValue)}},WatchableInputBinding.prototype.getElementValue=function(elem){if(this.getFn_)return String(this.getFn_(elem));var tag=elem.nodeName.toLowerCase();switch(tag){case"select":case"textarea":return elem.value;case"input":var type=elem.type;return"radio"===type||"checkbox"===type?elem.checked?elem.value:void 0:elem.value;default:return elem.textContent||""}},WatchableInputBinding.prototype.setElementValue=function(elem,newValue){if(this.setFn_)return void this.setFn_(elem,newValue);var tag=elem.nodeName.toLowerCase();switch(tag){case"select":case"textarea":elem.value=String(newValue);break;case"input":var type=elem.type;"radio"===type||"checkbox"===type?elem.checked=newValue==elem.value:elem.value=String(newValue);break;default:elem.textContent=String(newValue)}},WatchableInputBinding.prototype.bindElement=function(elem){var eventName,_this=this,tag=elem.nodeName.toLowerCase(),type=elem.type;eventName="input"!==tag||"radio"!==type&&"checkbox"!==type?"input":"change",elem.addEventListener(eventName,function(_){var valueStr=_this.getElementValue(elem);if(void 0!==valueStr){var watchableType=typeof _this.watchable_.get();if("number"===watchableType){var value=void 0;value=parseFloat(valueStr),_this.broadcastChange(value)}else if("boolean"===watchableType){var value=void 0;value="true"===valueStr,_this.broadcastChange(value)}else if("string"===watchableType){var value=void 0;value=valueStr,_this.broadcastChange(value)}else console.warn("Don't know what to do with a watchable of type "+watchableType)}})},WatchableInputBinding}(),FilterControls=function(){function FilterControls(containerElem_,state_){watchableBinding(state_.issue,"select[data-filter=issue]",containerElem_).broadcast(function(issue){state_.setIssue(issue)}),watchableBinding(state_.category,"input[name=category]",containerElem_).broadcast(function(category){state_.setCategory(category)}),watchableBinding(state_.platform,"select[data-filter=platform]",containerElem_).broadcast(function(platform){state_.setPlatform(platform)}),watchableBinding(state_.query,"#terms",containerElem_).broadcast(function(query){state_.setQuery(query)}),state_.loading.watch(function(loading){loading||elem("#terms").focus()})}return FilterControls;
}(),LoadingWall=function(){function LoadingWall(containerElem_,state_){var hideTimer_=-1;state_.loading.watch(function(loading){loading?(hideTimer_>-1&&(clearTimeout(hideTimer_),hideTimer_=-1),containerElem_.style.display="block",containerElem_.classList.add("active"),document.activeElement&&document.activeElement.blur()):(containerElem_.classList.remove("active"),hideTimer_=window.setTimeout(function(){containerElem_.style.display="none"},500))}),watchableBinding(state_.loadingRatio,".bar .progress",containerElem_).get(function(el){return parseInt(el.style.width||"0")/100}).set(function(el,ratio){el.style.width=Math.round(100*ratio)+"%"})}return LoadingWall}(),state=new GamesBrowserState;document.addEventListener("DOMContentLoaded",function(_){new GamesGrid(elem(".entries"),state),new FilterControls(elem(".filters"),state),new LoadingWall(elem("#smokedglass"),state),state.setIssue(36)}),exports.state=state}(this.dtbb=this.dtbb||{});