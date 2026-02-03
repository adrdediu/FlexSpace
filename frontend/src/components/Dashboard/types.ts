export interface Country {
    id:string;
    country_code:string;
    lat:number;
    lng:number;
    name:string;
    color?:string;
}

export interface LocationData {
    id:string;
    name:string;
    lat:number;
    lng:number;
    country_code:string;
    countryName?:string;
    floors: Floor[];
}

export interface Floor {
    id:string;
    name:string;
    level:number;
    locationId: string;
    rooms: Room[];
}

export interface Room {
    id:string;
    name:string;
    capacity:number;
    floorId: string;
    available:boolean;
    map_image?: string |null;
}

export interface Desk {
    id: number | string;
    name: string;
    room: number | string;
    room_name: string;
    is_booked: boolean;
    booked_by: string;
    is_locked: boolean;
    locked_by: boolean;
    pos_x:number;
    pos_y: number;
    orientation?: 'top' | 'bottom' | 'left' | 'right';
    is_permanent: boolean;
    permanent_assignee?: string |null;
}