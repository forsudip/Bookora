const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DB = path.join(ROOT, "data.json");

const seed = {
  users: [
    { id:"u_admin", name:"Bookora Admin", email:"admin@bookora.local", password:"admin123", role:"admin", createdAt:new Date().toISOString() }
  ],
  books: [
    {id:"b1", title:"The Art of Focus", author:"Maya Chen", category:"Self Growth", price:299, oldPrice:499, rating:4.9, badge:"Bestseller", description:"A practical guide to building deep focus, better habits and meaningful work.", emoji:"🎯"},
    {id:"b2", title:"AI for Everyone", author:"Noah Reed", category:"Technology", price:399, oldPrice:599, rating:4.8, badge:"Trending", description:"Understand modern AI, prompting and practical workflows without the jargon.", emoji:"🤖"},
    {id:"b3", title:"Money Mindset", author:"Ava Morgan", category:"Finance", price:249, oldPrice:399, rating:4.7, badge:"Popular", description:"Simple principles for saving, investing and building a healthier relationship with money.", emoji:"💸"},
    {id:"b4", title:"Design Your Life", author:"Leo Hart", category:"Lifestyle", price:349, oldPrice:549, rating:4.8, badge:"New", description:"A visual playbook for designing routines, goals and a life that feels intentional.", emoji:"✨"},
    {id:"b5", title:"The Creator Playbook", author:"Ethan Cole", category:"Business", price:449, oldPrice:699, rating:4.9, badge:"Hot", description:"Build an audience, package your knowledge and turn content into a digital business.", emoji:"🚀"},
    {id:"b6", title:"Atomic Study", author:"Nia Roy", category:"Education", price:199, oldPrice:299, rating:4.6, badge:"Student Pick", description:"A compact system for learning faster, remembering more and beating procrastination.", emoji:"📚"}
  ],
  orders: []
};

function readDB(){ try { return JSON.parse(fs.readFileSync(DB,"utf8")); } catch { fs.writeFileSync(DB, JSON.stringify(seed,null,2)); return structuredClone(seed); } }
function writeDB(db){ fs.writeFileSync(DB, JSON.stringify(db,null,2)); }
function send(res, code, data, type="application/json"){ res.writeHead(code, {"Content-Type":type, "Access-Control-Allow-Origin":"*", "Cache-Control":"no-store"}); res.end(type==="application/json"?JSON.stringify(data):data); }
function body(req){ return new Promise((resolve,reject)=>{ let d=""; req.on("data",c=>d+=c); req.on("end",()=>{try{resolve(d?JSON.parse(d):{})}catch(e){reject(e)}}); }); }
function token(){ return crypto.randomBytes(24).toString("hex"); }
const sessions = new Map();

async function route(req,res){
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;
  if(req.method==="OPTIONS"){res.writeHead(204,{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"Content-Type,Authorization","Access-Control-Allow-Methods":"GET,POST,PUT,DELETE,OPTIONS"});return res.end();}
  if(p.startsWith("/api/")){
    const db=readDB();
    if(req.method==="GET" && p==="/api/books") return send(res,200,{books:db.books,categories:[...new Set(db.books.map(b=>b.category))]});
    if(req.method==="GET" && p==="/api/stats"){
      return send(res,200,{users:db.users.length,orders:db.orders.length,revenue:db.orders.reduce((a,o)=>a+o.total,0),books:db.books.length});
    }
    if(req.method==="POST" && p==="/api/auth/register"){
      const b=await body(req); if(!b.name||!b.email||!b.password) return send(res,400,{error:"All fields are required"});
      if(db.users.some(u=>u.email.toLowerCase()===b.email.toLowerCase())) return send(res,409,{error:"Email already exists"});
      const u={id:"u_"+crypto.randomBytes(6).toString("hex"),name:b.name,email:b.email,password:b.password,role:"customer",createdAt:new Date().toISOString()};
      db.users.push(u); writeDB(db); const t=token(); sessions.set(t,u.id);
      return send(res,201,{token:t,user:{id:u.id,name:u.name,email:u.email,role:u.role}});
    }
    if(req.method==="POST" && p==="/api/auth/login"){
      const b=await body(req); const u=db.users.find(x=>x.email.toLowerCase()===String(b.email||"").toLowerCase()&&x.password===b.password);
      if(!u) return send(res,401,{error:"Invalid email or password"});
      const t=token(); sessions.set(t,u.id); return send(res,200,{token:t,user:{id:u.id,name:u.name,email:u.email,role:u.role}});
    }
    if(req.method==="POST" && p==="/api/orders"){
      const b=await body(req); const auth=req.headers.authorization||""; const uid=sessions.get(auth.replace("Bearer ",""));
      if(!uid) return send(res,401,{error:"Please log in first"});
      if(!Array.isArray(b.items)||!b.items.length) return send(res,400,{error:"Cart is empty"});
      const items=b.items.map(i=>{const book=db.books.find(x=>x.id===i.bookId); return book?{bookId:book.id,title:book.title,price:book.price,qty:i.qty||1}:null}).filter(Boolean);
      const total=items.reduce((a,i)=>a+i.price*i.qty,0);
      const o={id:"ORD-"+Date.now().toString(36).toUpperCase(),userId:uid,items,total,status:"paid_demo",paymentId:"DEMO_"+crypto.randomBytes(5).toString("hex"),createdAt:new Date().toISOString()};
      db.orders.push(o); writeDB(db); return send(res,201,{order:o});
    }
    if(req.method==="GET" && p==="/api/orders"){
      const auth=req.headers.authorization||""; const uid=sessions.get(auth.replace("Bearer ",""));
      if(!uid) return send(res,401,{error:"Please log in first"});
      return send(res,200,{orders:db.orders.filter(o=>o.userId===uid)});
    }
    if(req.method==="POST" && p==="/api/admin/books"){
      const auth=req.headers.authorization||""; const uid=sessions.get(auth.replace("Bearer ","")); const u=db.users.find(x=>x.id===uid);
      if(!u||u.role!=="admin") return send(res,403,{error:"Admin only"});
      const b=await body(req); const book={id:"b_"+Date.now().toString(36),title:b.title,author:b.author||"Bookora Author",category:b.category||"General",price:Number(b.price)||0,oldPrice:Number(b.oldPrice)||0,rating:5,badge:b.badge||"New",description:b.description||"",emoji:b.emoji||"📘"};
      db.books.unshift(book); writeDB(db); return send(res,201,{book});
    }
    if(req.method==="DELETE" && p.startsWith("/api/admin/books/")){
      const auth=req.headers.authorization||""; const uid=sessions.get(auth.replace("Bearer ","")); const u=db.users.find(x=>x.id===uid);
      if(!u||u.role!=="admin") return send(res,403,{error:"Admin only"});
      const id=p.split("/").pop(); db.books=db.books.filter(x=>x.id!==id); writeDB(db); return send(res,200,{ok:true});
    }
    return send(res,404,{error:"API route not found"});
  }
  let file=p==="/"?"/index.html":p;
  const full=path.normalize(path.join(PUBLIC,file));
  if(!full.startsWith(PUBLIC)) return send(res,403,"Forbidden","text/plain");
  fs.readFile(full,(e,data)=>{if(e)return send(res,404,"Not found","text/plain"); const ext=path.extname(full); const mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".json":"application/json"}[ext]||"application/octet-stream"; send(res,200,data,mime);});
}
http.createServer((req,res)=>route(req,res).catch(e=>send(res,500,{error:e.message}))).listen(PORT,()=>console.log(`Bookora running at http://localhost:${PORT}`));