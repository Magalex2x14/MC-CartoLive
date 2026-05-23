import appIconUrl from './brand/routes_app_icon_192.png';
import companionIconUrl from './icons/companion_64.png';
import observerIconUrl from './icons/observer_64.png';
import repeaterIconUrl from './icons/repeater_64.png';
import roomIconUrl from './icons/room_64.png';
import towerIconUrl from './icons/tower_64.png';
import dotAckUrl from './packets/dot_ack_64.png';
import dotAdvUrl from './packets/dot_adv_64.png';
import dotCtlUrl from './packets/dot_ctl_64.png';
import dotGrpUrl from './packets/dot_grp_64.png';
import dotOthUrl from './packets/dot_oth_64.png';
import dotRetUrl from './packets/dot_ret_64.png';
import dotTrcUrl from './packets/dot_trc_64.png';
import dotTxtUrl from './packets/dot_txt_64.png';

export const routeAssetIcons = {
  app: appIconUrl,
  repeater: repeaterIconUrl,
  companion: companionIconUrl,
  room: roomIconUrl,
  observer: observerIconUrl,
  tower: towerIconUrl
};

export const routePacketDots: Record<string, string> = {
  ADVERT: dotAdvUrl,
  PLAIN_TEXT: dotTxtUrl,
  GROUP_TEXT: dotGrpUrl,
  GROUP_DATA: dotGrpUrl,
  TRACE: dotTrcUrl,
  RETURNED_PATH: dotRetUrl,
  ACK: dotAckUrl,
  CONTROL: dotCtlUrl,
  OTHER: dotOthUrl
};
