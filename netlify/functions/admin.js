const API='https://api.github.com';
exports.handler=async event=>{
 const h={'Content-Type':'application/json','Cache-Control':'no-store'};
 if(event.httpMethod!=='POST')return{statusCode:405,headers:h,body:'{}'};
 const pw=event.headers['x-admin-password']||event.headers['X-Admin-Password'];
 if(!process.env.ADMIN_PASSWORD||pw!==process.env.ADMIN_PASSWORD)return{statusCode:401,headers:h,body:JSON.stringify({error:'Неверный пароль'})};
 const token=process.env.GITHUB_TOKEN,repo=process.env.GITHUB_REPO||'ivanx72x-cyber/masterskaya-3d',branch=process.env.GITHUB_BRANCH||'main';
 if(!token)return{statusCode:500,headers:h,body:JSON.stringify({error:'В Netlify не задан GITHUB_TOKEN'})};
 const gh=async(path,opts={})=>fetch(API+path,{...opts,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(opts.headers||{})}});
 const read=async()=>{let r=await gh('/repos/'+repo+'/contents/products.json?ref='+branch);if(!r.ok)throw Error('Не удалось прочитать каталог');let j=await r.json();return{items:JSON.parse(Buffer.from(j.content,'base64').toString()).items||[],sha:j.sha}};
 try{let b=JSON.parse(event.body||'{}');
 if(b.action==='load'){let d=await read();return{statusCode:200,headers:h,body:JSON.stringify({items:d.items})}}
 if(b.action==='upload'){if(!/^[\w.-]+$/.test(b.filename||'')||!['image/jpeg','image/png','image/webp'].includes(b.mime)||typeof b.data!=='string'||b.data.length>5600000)throw Error('Проверь фото: JPG/PNG/WebP до 4 МБ');let ext=b.mime==='image/jpeg'?'jpg':b.mime.split('/')[1],name=Date.now()+'-'+b.filename.replace(/\.[^.]+$/,'')+'.'+ext,path='uploads/'+name;let r=await gh('/repos/'+repo+'/contents/'+path,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Upload product image',content:b.data,branch})});if(!r.ok)throw Error('Не удалось загрузить фото в GitHub');return{statusCode:200,headers:h,body:JSON.stringify({url:'/uploads/'+name})}}
 if(b.action==='save'){if(!Array.isArray(b.items))throw Error('Некорректный каталог');let d=await read(),content=Buffer.from(JSON.stringify({items:b.items},null,2)).toString('base64');let r=await gh('/repos/'+repo+'/contents/products.json',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'Update product catalog',content,sha:d.sha,branch})});if(!r.ok)throw Error('Не удалось сохранить каталог');return{statusCode:200,headers:h,body:JSON.stringify({ok:true})}}
 return{statusCode:400,headers:h,body:JSON.stringify({error:'Неизвестная команда'})}
 }catch(e){return{statusCode:500,headers:h,body:JSON.stringify({error:e.message||'Ошибка сервера'})}}
};