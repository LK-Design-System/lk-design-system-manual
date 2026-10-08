// Vite URL imports stay out of persisted DTOs and the pure brand registry.
import brand0Url from "@lk-design-system/lds-theme/assets/brand/lk-mark-navy.svg?url";
import brand1Url from "@lk-design-system/lds-theme/assets/brand/lk-mark-white.svg?url";
import brand2Url from "@lk-design-system/lds-theme/assets/brand/lk-logo-inline-navy.svg?url";
import brand3Url from "@lk-design-system/lds-theme/assets/brand/lk-logo-inline-white.svg?url";
import brand4Url from "@lk-design-system/lds-theme/assets/brand/lk-logo-navy.svg?url";
import brand5Url from "@lk-design-system/lds-theme/assets/brand/lk-logo-white.svg?url";
import brand6Url from "@lk-design-system/lds-theme/assets/brand/lk-logo-banner-navy.svg?url";
import brand7Url from "@lk-design-system/lds-theme/assets/brand/lk-logo-banner-light.svg?url";
import brand8Url from "@lk-design-system/lds-theme/assets/brand/lk-logo-official.svg?url";
import brand9Url from "@lk-design-system/lds-theme/assets/brand/lk-logo-official-light.svg?url";
import brand10Url from "@lk-design-system/lds-theme/assets/brand/lk-logo-official-corporate.svg?url";
import brand11Url from "@lk-design-system/lds-theme/assets/brand/lk-logo-official-corporate-light.svg?url";
const urls=Object.freeze({
 "@lk-design-system/lds-theme/assets/brand/lk-mark-navy.svg":brand0Url,
 "@lk-design-system/lds-theme/assets/brand/lk-mark-white.svg":brand1Url,
 "@lk-design-system/lds-theme/assets/brand/lk-logo-inline-navy.svg":brand2Url,
 "@lk-design-system/lds-theme/assets/brand/lk-logo-inline-white.svg":brand3Url,
 "@lk-design-system/lds-theme/assets/brand/lk-logo-navy.svg":brand4Url,
 "@lk-design-system/lds-theme/assets/brand/lk-logo-white.svg":brand5Url,
 "@lk-design-system/lds-theme/assets/brand/lk-logo-banner-navy.svg":brand6Url,
 "@lk-design-system/lds-theme/assets/brand/lk-logo-banner-light.svg":brand7Url,
 "@lk-design-system/lds-theme/assets/brand/lk-logo-official.svg":brand8Url,
 "@lk-design-system/lds-theme/assets/brand/lk-logo-official-light.svg":brand9Url,
 "@lk-design-system/lds-theme/assets/brand/lk-logo-official-corporate.svg":brand10Url,
 "@lk-design-system/lds-theme/assets/brand/lk-logo-official-corporate-light.svg":brand11Url
});
const own=(object,key)=>Object.prototype.hasOwnProperty.call(object,key);
export function resolveManualAsset(key,assets={}){
 if(typeof key!=='string')return '';
 if(own(urls,key))return urls[key];
 return assets&&own(assets,key)&&typeof assets[key]==='string'?assets[key]:'';
}
