import type {MetadataRoute} from 'next';
export default function manifest():MetadataRoute.Manifest{
 return {id:'/',name:'Memonestia',short_name:'Memonestia',description:'Photos and the stories behind them',start_url:'/?home=1',scope:'/',display:'standalone',background_color:'#fff8f5',theme_color:'#99452c',icons:[{src:'/icon.svg',sizes:'any',type:'image/svg+xml'},{src:'/apple-icon.png',sizes:'180x180',type:'image/png'}]};
}
