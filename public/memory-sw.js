self.addEventListener('push',event=>{
 let data;try{data=event.data.json();}catch{return;}
 const url=new URL(data.url||'/crew/photos',self.location.origin);
 if(url.origin!==self.location.origin)return;
 event.waitUntil(self.registration.showNotification('Memonestia',{body:data.body||'New memories are waiting',icon:'/apple-icon.png',tag:'memory-update',data:{url:url.href}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const url=new URL(event.notification.data?.url||'/crew/photos',self.location.origin);if(url.origin!==self.location.origin)return;
 event.waitUntil(clients.openWindow(url.href));
});
