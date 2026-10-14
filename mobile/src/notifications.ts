import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { request } from './api';

Notifications.setNotificationHandler({handleNotification:async()=>({shouldPlaySound:false,shouldSetBadge:false,shouldShowBanner:true,shouldShowList:true})});
export async function enableNotifications() {
  if(Platform.OS==='android') await Notifications.setNotificationChannelAsync('photos',{name:'Shared photos',importance:Notifications.AndroidImportance.DEFAULT});
  let permission=await Notifications.getPermissionsAsync();
  if(!permission.granted) permission=await Notifications.requestPermissionsAsync();
  if(!permission.granted) throw new Error('NOTIFICATION_PERMISSION_REQUIRED');
  const projectId=Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if(!projectId) throw new Error('PUSH_NOT_CONFIGURED');
  const token=await Notifications.getExpoPushTokenAsync({projectId});
  await request('/api/push',{method:'POST',body:JSON.stringify({token:token.data,platform:Platform.OS})});
}
export async function disableNotifications(){await request('/api/push',{method:'DELETE'});}
export function observeNotifications(open:(folderId:string)=>void){
  const handle=(response:Notifications.NotificationResponse)=>{
    const id=response.notification.request.content.data?.folderId;
    if(typeof id==='string'&&/^[a-f0-9-]{36}$/i.test(id))open(id);
  };
  const last=Notifications.getLastNotificationResponse();if(last)handle(last);
  const sub=Notifications.addNotificationResponseReceivedListener(handle);
  return ()=>sub.remove();
}
