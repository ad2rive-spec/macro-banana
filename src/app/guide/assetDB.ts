/**
 * assetDB.ts
 * 
 * IndexedDB wrapper for storing original asset Files across page navigations.
 * The guide stores File objects here; Studio fetches them back by tag key.
 * 
 * DB: guide_assets  Store: files  Key: tag string (e.g. "@image1")
 */

const DB_NAME  = 'guide_assets'
const DB_VER   = 1
const STORE    = 'files'

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

export async function storeAssetFile(tag: string, file: File): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(file, tag)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

export async function getAssetFile(tag: string): Promise<File | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(tag)
    req.onsuccess = () => resolve(req.result ?? null)
    req.onerror   = () => reject(req.error)
  })
}

export async function getAllAssetFiles(tags: string[]): Promise<Map<string, File>> {
  const db = await openDB()
  const result = new Map<string, File>()
  await Promise.all(tags.map(tag => new Promise<void>((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(tag)
    req.onsuccess = () => { if (req.result) result.set(tag, req.result); resolve() }
    req.onerror   = () => reject(req.error)
  })))
  return result
}

export async function clearAssetFiles(): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}
