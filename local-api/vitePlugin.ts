import type { IncomingMessage, ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { handleLocalMitraRequest } from './mitraApi.js'
import { MitraSqliteStore } from './mitraSqlite.js'

const readBody=(request:IncomingMessage)=>new Promise<ArrayBuffer>((resolveBody,reject)=>{const chunks:Buffer[]=[];request.on('data',(chunk:Buffer)=>chunks.push(chunk));request.on('end',()=>{const source=Buffer.concat(chunks),copy=new Uint8Array(source.byteLength);copy.set(source);resolveBody(copy.buffer)});request.on('error',reject)})

async function writeWebResponse(response:Response,target:ServerResponse){
 target.statusCode=response.status
 response.headers.forEach((value,key)=>target.setHeader(key,value))
 target.end(Buffer.from(await response.arrayBuffer()))
}

export function localMitraSqlitePlugin():Plugin{
 return{name:'local-mitra-sqlite',apply:'serve',configureServer(server){
  const store=new MitraSqliteStore(resolve(process.cwd(),'.local-data','akun-mitra.sqlite'))
  server.httpServer?.once('close',()=>store.close())
  server.middlewares.use(async(request,response,next)=>{
   if(!request.url?.startsWith('/api/local/mitra')){next();return}
   try{
    const host=request.headers.host??'localhost'
    const body=['GET','HEAD'].includes(request.method??'GET')?undefined:await readBody(request)
    const headers=new Headers()
    for(const [key,value] of Object.entries(request.headers)){if(Array.isArray(value))for(const item of value)headers.append(key,item);else if(value!==undefined)headers.set(key,value)}
    const webRequest=new Request(`http://${host}${request.url}`,{method:request.method,headers,body})
    const result=await handleLocalMitraRequest(webRequest,store)
    if(!result){next();return}
    await writeWebResponse(result,response)
   }catch(error){
    response.statusCode=500
    response.setHeader('content-type','application/json')
    response.end(JSON.stringify({error:error instanceof Error?error.message:'Local SQLite API gagal.'}))
   }
  })
 }}
}
