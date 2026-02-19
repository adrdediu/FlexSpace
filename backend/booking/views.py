from django.conf import settings
from django.forms import ValidationError
from django.db import transaction
from typing import Optional
from datetime import datetime, timezone as dt_timezone
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from django.utils.timezone import is_naive
from rest_framework import viewsets, generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import action
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from booking.services.desk_lock import acquire_lock, read_lock, refresh_lock, release_lock
from .models import Country, Location, Floor, Room, Desk, Booking

from .serializers.accounts import LoginTokenObtainPairSerializer
from .serializers.country import CountrySerializer
from .serializers.desk import DeskSerializer
from .serializers.booking import BookingSerializer
from .serializers.floor import FloorSerializer
from .serializers.location import LocationSerializer
from .serializers.room import RoomSerializer, RoomWithDesksSerializer

import datetime

class CountryViewSet(viewsets.ModelViewSet):
    queryset = Country.objects.all()
    serializer_class = CountrySerializer
    permission_classes = [permissions.IsAuthenticated]

class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['country']

class FloorViewSet(viewsets.ModelViewSet):
    queryset = Floor.objects.all()
    serializer_class = FloorSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['location']

class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['floor']

    @action(detail=True, methods=['get'])
    def desks(self, request, pk=None):
        room = self.get_object()
        serializer = RoomWithDesksSerializer(room, context={'request':request})
        return Response(serializer.data)
    
    @action(detail= True, methods=['get'])
    def availability(self, request, pk=None):
        """
        Returns availability for all desks in this room over the given period
        Query params:
            start (YYYY-MM-DD, optional, default today)
            days(int,optional,default 14)
        """
        room = self.get_object()

        try:
            start_date = datetime.strptime(
                request.query_params.get('start', datetime.today().strftime("%Y-%m-%d")),
                "%Y-%m-%d"
            ).date()
        except ValueError:
            return Response({"error": "Invalid data format, use YYYY-MM-DD"},status=400)
        
        try:
            days = int(request.query_params.get('days',14))
        except ValueError:
            return Response({"error": "days must be integer"}, status = 400)
        
        end_date = start_date + time_delta(days=days - 1)

        desks = Desk.objects.filter(room=room)

        bookings = Booking.objects.filter(
            desk__room=room,
            start_time__date__lte=end_date,
            end_time__date__gte=start_date
        )

        data = {
            "room_id":room.id,
            "room_name":room.name,
            "start_date": str(start_date),
            "end_date": str(end_date),
            "desks": []
        }

        for desk in desks:
            daily_status = {}
            for i in range(days):
                day = start_date + timedelta(days=i)
                booked = bookings.filter(
                    desk=desk,
                    start_time__date__lte=day,
                    end_time__date__gte=day
                ).exists()
                daily_status[str(day)] = not booked # True if available
            data["desks"].append({
                "desk_id": desk.id,
                "desk_name":desk.name,
                "availability":daily_status
            })
        
        return Response(data)
    
class DeskViewSet(viewsets.ModelViewSet):
    queryset = Desk.objects.all()
    serializer_class = DeskSerializer
    permission_classes = [permissions.IsAuthenticated]  
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['room']

    def _is_desk_manager(self, request, desk):
        """Check if user can manage this desk (room manager, location manager, or superuser)"""
        user = request.user
        if user.is_superuser or user.is_staff:
            return True
        if desk.room.is_room_manager(user):
            return True
        if desk.room.floor.location.is_location_manager(user):
            return True
        return False

    @action(detail=True, methods=['post'], url_path='assign-permanent')
    def assign_permanent(self, request, pk=None):
        """
        Permanently assign a desk to a user.
        Endpoint: POST /api/desks/{id}/assign-permanent/
        Body: {"user_id": 5}
        """
        desk = self.get_object()

        if not self._is_desk_manager(request, desk):
            return Response(
                {'error': 'You do not have permission to assign permanent desks'},
                status=status.HTTP_403_FORBIDDEN
            )

        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'user_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            assignee = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        desk.is_permanent = True
        desk.permanent_assignee = assignee
        desk.full_clean()
        desk.save()

        serializer = self.get_serializer(desk)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='clear-permanent')
    def clear_permanent(self, request, pk=None):
        """
        Remove permanent assignment from a desk.
        Endpoint: POST /api/desks/{id}/clear-permanent/
        """
        desk = self.get_object()

        if not self._is_desk_manager(request, desk):
            return Response(
                {'error': 'You do not have permission to modify permanent desks'},
                status=status.HTTP_403_FORBIDDEN
            )

        desk.is_permanent = False
        desk.permanent_assignee = None
        desk.save()

        serializer = self.get_serializer(desk)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def lock_state(self, request, pk=None):
        data = read_lock(int(pk)) # type: ignore
        if not data:
            return Response({"locked": False}, status=200)
        return Response({"locked":True, "by":data.get("username")}, status=200)
    
    @action(detail=True, methods = ['get'])
    def availability(self, request, pk=None):
        """
        Check free/busy days for a given desk.
        Query params:
            start (YYYY-MM-DD, OPTIONAL , default today)
            days (integer, optional, default 14)
        """
        desk = self.get_object()

        try:
            start_date = datetime.strptime(
                request.query_params.get('start', datetime.today().strftime("%Y-%m-%d")),
                "%Y-%m-%d"
            ).date()
        except ValueError:
            return Response({"error":"Invalid start date fromat, use YYYY-MM-DD"}, status=400)
        
        try:
            days = int(request.query_params.get('days',14))
        except ValueError:
            return Response({"error": "days must be integer"}, status = 400)
        
        end_date = start_date + time_delta(days=days - 1)

        bookings = Booking.objects.filter(
            desk = desk,
            start_time__date__lte = end_date,
            end_time__date__gte=start_date
        )

        availability = {}
        for i in range(days):
            current_day = start_date + datetime.timedelta(days=i)
            booked = bookings.filter(
                start_time__date__lte=current_day,
                end_time__date__gte=current_day
            ).exists()
            availability[str(current_day)] = not booked

        return Response({
            "desk_id": desk.id,
            "desk-name": desk.name,
            "start_date": str(start_date),
            "end_date": str(end_date),
            "availability": availability
        })

class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.select_related('desk','user').all()
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()

        user_id = self.request.query_params.get('user')
        user_only = self.request.query_params.get('user_only')

        # If the user parameter is provided ensure it matches the authenticated user

        if user_id:
            if not self.request.user.is_staff and str(self.request.user.id) != str(user_id):
                raise PermissionDenied("You can only view your own bookings.")
            qs = qs.filter(user_id=user_id)

        if user_only:
            qs = qs.filter(user=self.request.user)

        desk = self.request.query_params.get('desk')
        start = self.request.query_params.get('start')
        end = self.request.query_params.get('end')

        if desk:
            qs = qs.filter(desk_id=desk)
        
        if start and end:
            def parse_iso(s: str) -> Optional[datetime.datetime]:
                try:
                    if s.endswith('Z'):
                        return datetime.datetime.fromisoformat(s.replace('Z', '+00:00'))
                    return datetime.datetime.fromisoformat(s)
                except Exception:
                    return None
                
            start_dt = parse_iso(start)
            end_dt = parse_iso(end)

            if start_dt and end_dt:
                if is_naive(start_dt):
                    start_dt = start_dt.replace(tzinfo=dt_timezone.utc)
                if is_naive(end_dt):
                    end_dt = end_dt.replace(tzinfo=dt_timezone.utc)

                qs = qs.filter(start_time__lt=end_dt, end_time__gt=start_dt)
        
        return qs

    def _broadcast_desk_status(self, desk:Desk):
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"room_{desk.room_id}",
            {
                "type": "desk_status",
                "desk_id": desk.id,
                "is_booked":desk.is_booked,
                "booked_by": desk.booked_by.username if desk.booked_by else None,
            }
        )    
    
    def _broadcast_update_bookings(self, desk:Desk, *, upsert_qs=None, delete_ids=None):

        channel_layer = get_channel_layer()
        action = "mixed"
        payload = {"type": "update_bookings", "desk_id":desk.id}

        if upsert_qs is not None and (delete_ids is None or len(delete_ids)==0):
            action = "upsert"
        elif delete_ids and (upsert_qs is None or upsert_qs.count() == 0):
            action = "delete"

        payload["action"] = action

        if upsert_qs is not None:
            data = BookingSerializer(upsert_qs, many=True).data
            payload["bookings"] = data
        if delete_ids:
            payload["deleted_ids"] = list(delete_ids)

        async_to_sync(channel_layer.group_send)(
            f"room_{desk.room_id}",
            payload
        )

    @action(detail=False, methods=['post'],url_path='lock')
    def lock(self, request):
        desk_id = request.data.get("desk_id")
        if not desk_id:
            return Response({"detail":"desk_id required"},status=400)

        ok = acquire_lock(int(desk_id), request.user.id, request.user.username)
        if ok:
            Desk.objects.filter(pk=desk_id).update(is_locked=True,locked_by=request.user)

            channel_layer=get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"room_{Desk.objects.get(pk=desk_id).room_id}",
                {"type":"desk_lock","desk_id":int(desk_id),"locked":True, "by":request.user.username}
            )
            return Response({"ok":True}, status=200)
        
        data = read_lock(int(desk_id)) or {}
        return Response({"ok":False, "locked_by": data.get("username")}, status=423)
    
    @action(detail=False, methods=['post'], url_path='refresh_lock')
    def refresh_lock_action(self,request):
        desk_id = request.data.get('desk_id')
        if not desk_id:
            return Response({"detail":"desk_id required"},status = 400)
        ok = refresh_lock(int(desk_id),request.user.id)
        return Response({"ok":ok}, status=200 if ok else 409)

    @action(detail=False, methods=['post'], url_path='unlock')
    def unlock(self, request):
        desk_id = int(request.data.get("desk_id"))
        ok = release_lock(desk_id, request.user.id)
        if ok:
            Desk.objects.filter(pk=desk_id).update(is_locked=False,locked_by=None)
            channel_layer = get_channel_layer()
            desk = Desk.objects.get(pk=desk_id)
            async_to_sync(channel_layer.group_send)(
                f"room_{desk.room_id}",
                {"type":"desk_lock", "desk_id":desk_id, "locked":False}
            )
            return Response({"ok":True}, status=200)
        return Response({"ok":False},status=409)
    
    @transaction.atomic
    def perform_create(self,serializer):
        """
        Create a single booking with overlap prevention and lock validation,
        then broadcast status and only the newly created booking.
        """
        desk_id = int(self.request.data.get("desk_id"))
        lock = read_lock(desk_id)
        if lock and lock.get("user_id") != self.request.user.id:
            raise ValidationError({"detail": "Desk currently locked by another user."})
        
        start_dt = datetime.datetime.fromisoformat(self.request.data["start_time"].replace('Z','+00:00'))
        end_dt = datetime.datetime.fromisoformat(self.request.data["end_time"].replace('Z','+00:00'))

        now = timezone.now()
        if start_dt < now:
            raise ValidationError({"detail": "Booking start time cannot be in the past."})
        if end_dt <= start_dt:
            raise ValidationError({"detail": "end_time must be after start_time."})

        with transaction.atomic():
            desk_locked = Desk.objects.select_for_update().get(pk=desk_id)

            if desk_locked.is_permanent:
                if not desk_locked.permanent_assignee:
                    raise ValidationError({
                        "detail": "This permanent desk has no assignee. Please contact an admin."
                    })
                if desk_locked.permanent_assignee != self.request.user:
                    raise ValidationError({
                        "detail": f"This desk is permanently assigned to {desk_locked.permanent_assignee.username}."
                    })
            
            overlap_exists = Booking.objects.filter(
                desk=desk_locked,
                start_time__lt=end_dt,
                end_time__gt=start_dt
            ).exists()
            if overlap_exists:
                raise ValidationError({"detail":"Desk already booked in this time range"})
            
            booking = serializer.save(user=self.request.user, desk=desk_locked)

            desk_locked.refresh_booking_state()
            self._broadcast_desk_status(desk_locked)

            self._broadcast_update_bookings(desk_locked, upsert_qs=Booking.objects.filter(pk=booking.pk))
        
        return booking

    @transaction.atomic
    def perform_destroy(self,instance):
        desk = instance.desk
        deleted_id = instance.id
        super().perform_destroy(instance)

        desk.refresh_booking_state()
        self._broadcast_desk_status(desk=desk)
        self._broadcast_update_bookings(desk,delete_ids=[deleted_id])

    
    # Bulk create
    @action(detail=False,methods=['post'], url_path='bulk_create')
    @transaction.atomic
    def bulk_create(self,request):
        """
        Create multiple bookings for a desk..

        Body:
        {
            "desk_id": <int>,
            "intervals": [{"start_time": <iso>, "end_time": <iso>},...],
            "atomic" : false # optional, default false (partial success)
        }

        Responses:
            -Partial (default): 200 { "results": [{ok, status, error?, conflict_days?}]}
            - Atomic success: 201 { "ok": true }
            - Atomic failure (overlap): 409 { "detail": "Overlap detected..." }
        """

        desk_id = request.data.get("desk_id")
        desk_locked = Desk.objects.select_for_update().get(pk=desk_id)

        if desk_locked.is_permanent:
            if not desk_locked.permanent_assignee:
                raise ValidationError({
                    "detail": "This permanent desk has not assignee. Please contact an admin."
                })
            if desk_locked.permanent_assignee != self.request.user:
                raise ValidationError({
                    "detail": f"This desk is permanently assigned to {desk_locked.permanent_assignee.username}."
                })
            
        intervals = request.data.get("intervals",[])
        atomic = bool(request.data.get("atomic",False))

        if not desk_id or not isinstance(intervals, list) or len(intervals) == 0:
            return Response({"detail": "desk_id and non-empty intervals required"}, status = 400)
        
        lock = read_lock(int(desk_id))
        if lock and lock.get("user_id") != request.user.id:
            return Response({"detail": "Desk currently locked by another user."},status=423)
        
        parsed = []
        now = timezone.now()
        for iv in intervals:
            try:
                s = datetime.datetime.fromisoformat(iv["start_time"].replace('Z','+00:00'))
                e = datetime.datetime.fromisoformat(iv["end_time"].replace('Z','+00:00'))
            except Exception:
                return Response({"detail":"Invalid interval timestamps"}, status = 400)
            if s < now:
                return Response({"detail": "Booking start time cannot be in the past."}, status=400)
            if e <= s:
                return Response({"detail": "end_time must be after start_time"}, status=400)
            parsed.append((s, e))

        parsed.sort(key=lambda t:t[0])

        def find_conflict_days(desk:Desk, s:datetime.datetime, e:datetime.datetime):
            """
            Return overlapping day(s) as YYYY-MM-DD strings for clearer frontend messaging.
            """
            overlaps = Booking.objects.filter(desk=desk, start_time__lt=e, end_time__gt=s)
            days = set()
            for b in overlaps:
                start_day = max(s.date(), b.start_time.date())
                end_day =min(e.date(), b.end_time.date())
                cur = start_day
                while cur <= end_day:
                    days.add(cur.isoformat())
                    cur = cur + datetime.timedelta(days=1)
            return sorted(list(days))
        
        if atomic:
            with transaction.atomic():
                desk_locked = Desk.objects.select_for_update().get(pk=desk_id)

                for s, e in parsed:
                    if Booking.objects.filter(desk=desk_locked, start_time__lt=e, end_time__gt=s).exists():
                        return Response({"detail": "Overlap detected in one or more intervals"}, status = 409)
                

                created_objs = []
                for s,e in parsed:
                    bk = Booking.objects.create(user=request.user, desk=desk_locked, start_time=s, end_time = e)
                    created_objs.append(bk)

                desk_locked.refresh_booking_state()
                self._broadcast_desk_status(desk_locked)

                self._broadcast_update_bookings(desk_locked,upsert_qs=Booking.objects.filter(pk__in=[b.pk for b in created_objs]))
            
            return Response({"ok": True}, status = 201)
        
        # Partial mode
        results = []
        approved_objs = []

        with transaction.atomic():
            desk_locked = Desk.objects.select_for_update().get(pk=desk_id)

            for s, e in parsed:
                exists = Booking.objects.filter(desk=desk_locked, start_time__lt=e, end_time__gt=s).exists()
                if exists:
                    conflict_days = find_conflict_days(desk_locked, s, e)
                    results.append({
                        "start_time": s.isoformat(),
                        "end_time": e.isoformat(),
                        "ok": False,
                        "status": 409,
                        "error": "Overlap",
                        "conflict_days": conflict_days,
                    })
                else:
                    bk = Booking.objects.create(user=request.user, desk=desk_locked, start_time=s, end_time=e)
                    approved_objs.append(bk)
                    results.append({
                        "start_time": s.isoformat(),
                        "end_time": e.isoformat(),
                        "ok": True,
                        "status": 201,
                    })
            
            desk_locked.refresh_booking_state()
            self._broadcast_desk_status(desk_locked)

            if approved_objs:
                self._broadcast_update_bookings(desk_locked, upsert_qs=Booking.objects.filter(pk__in=[b.pk for b in approved_objs]))
            
        return Response({"results": results}, status=200)

    def _parse_iso(self, s:str) -> datetime.datetime:
        return datetime.datetime.fromisoformat(s.replace('Z','+00:00')) if s.endswith('Z') else datetime.datetime.fromisoformat(s)

    def update(self,request, *args, **kwargs):
        return self._update_booking(request, partial=False, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        return self._update_booking(request, partial=True, *args, **kwargs)

    def _update_booking(self, request, partial:bool, *args, **kwargs):
        booking = self.get_object()
        desk = booking.desk

        lock = read_lock(desk.id)
        if lock and lock.get("user_id") != request.user.id:
            raise ValidationError({"detail": "Desk currently locked by another user."})
        
        s_raw = request.data.get("start_time")
        e_raw = request.data.get("end_time")
        if s_raw and e_raw:
            try:
                s_dt = self._parse_iso(s_raw)
                e_dt = self._parse_iso(e_raw)
            except Exception:
                raise ValidationError({"detail": "Invalid timestamps"})

            now = timezone.now()
            if s_dt < now:
                raise ValidationError({"detail": "Booking start time cannot be in the past."})
            if e_dt <= s_dt:
                raise ValidationError({"detail": "end_time must be after start_time."})
            
            with transaction.atomic():
                desk_locked = Desk.objects.select_for_update().get(pk=desk.pk)

                exists = Booking.objects.filter(
                    desk = desk_locked,
                    start_time__lt=e_dt,
                    end_time__gt=s_dt
                ).exclude(pk=booking.pk).exists()
                if exists:
                    return Response({"detail": "Desk already booked in this time range"},status=409)

                serializer = self.get_serializer(booking, data = request.data, partial = partial)
                serializer.is_valid(raise_exception=True)
                self.perform_update(serializer)

                desk_locked.refresh_booking_state()
                self._broadcast_desk_status(desk_locked)
                self._broadcast_update_bookings(desk_locked, upsert_qs=Booking.objects.filter(pk=booking.pk))
            
            return Response(serializer.data, status=200)

        response= super().partial_update(request, *args, **kwargs) if partial else super().update(request, *args, **kwargs)
        desk.refresh_booking_state()
        self._broadcast_desk_status(desk)
        self._broadcast_update_bookings(desk, upsert_qs=Booking.objects.filter(pk=booking.pk))
        return response
    
    @action(detail=True, methods=['post'], url_path='edit_intervals')
    def edit_intervals(self, request, pk = None):
        """
        Edit action: update the base booking and create additional intervals if needed.

        Body: {
            "intervals":[
                {"start_time":"<ISO8601>", "end_time":"<ISO8601>"},
            ]
        }

        Rules:
        - If intervals is empty delete the base booking
        - First Interval updates the base booking(pk)
        - Additional intervals create new bookings
        - Intervals will be merged if overlapping or adjacent
        - Only affects this user's bookings on the same desk
        - Overlaps with other users cause 409 and no change
        - Returns WS broadcasts: desk_status + update_bookings (upserts + deleted_ids)
        """
        base_booking = self.get_object()
        desk = base_booking.desk
        user = request.user

        if base_booking.user != user:
            return Response({"detail": "You can only edit your own bookings"}, status=403)
        
        payload = request.data.get("intervals", [])
        if not isinstance(payload, list):
            return Response({"detail": "intervals must be a list"}, status=400)
        
        if len(payload) == 0:
            deleted_id = base_booking.id

            with transaction.atomic():
                desk_locked = Desk.objects.select_for_update().get(pk=desk.pk)
                base_booking.delete()

                desk_locked.refresh_booking_state()
                self._broadcast_desk_status(desk_locked)
                self._broadcast_update_bookings(desk_locked,upsert_qs=None,delete_ids=[deleted_id])

            return Response({
                "message": "Booking deleted",
                "deleted_ids": [deleted_id],
                "created_ids": [],
                "intervals": [],
            }, status = 200)
        
        now = timezone.now()
        parsed = []
        for iv in payload:
            try:
                s_raw = iv["start_time"]
                e_raw = iv["end_time"]
                s_dt = datetime.datetime.fromisoformat(s_raw.replace('Z','+00:00')) if isinstance(s_raw,str) else None
                e_dt = datetime.datetime.fromisoformat(e_raw.replace('Z','+00:00')) if isinstance(e_raw,str) else None
            except Exception:
                return Response({"detail": "Invalid interval timestamps"}, status = 400)
            if not s_dt or not e_dt or e_dt <= s_dt:
                return Response({"detail": "Each interval must have valid start_time < end_time"}, status=400)
            if s_dt < now:
                return Response({"detail": "Booking start time cannot be in the past."}, status=400)
            parsed.append((s_dt, e_dt))

        parsed.sort(key = lambda t: t[0])

        def merge_intervals(itvs, adjacent = True):
            if not itvs:
                return []
            merged = [list(itvs[0])]
            for s,e in itvs[1:]:
                last_s, last_e = merged[-1]
                if s <= last_e or (adjacent and s == last_e):
                    if e > last_e:
                        merged[-1][1] = e
                
                else:
                    merged.append([s,e])
            
            return [(s ,e) for s, e in merged]
        
        merged_intervals = merge_intervals(parsed, adjacent = True)

        original_start = base_booking.start_time
        original_end = base_booking.end_time
        win_start = min(original_start, merged_intervals[0][0])
        win_end = max(original_end, merged_intervals[-1][1])

        lock = read_lock(desk.id)
        if lock and lock.get("user_id") != user.id:
            return Response({"detail": "Desk currently locked by another user."}, status=423)

        deleted_ids = []
        created_objs = []
        
        with transaction.atomic():
            desk_locked = Desk.objects.select_for_update().get(pk=desk.pk)

            to_delete = Booking.objects.filter(
                desk = desk_locked,
                user = user,
                start_time__lt = win_end,
                end_time__gt=win_start,
            ).exclude(pk=base_booking.pk)

            deleted_ids = list(to_delete.values_list('id', flat=True))
            to_delete.delete()

            conflict = Booking.objects.filter(
                desk=desk_locked,
                start_time__lt=win_end,
                end_time__gt=win_start
            ).exclude(user=user)

            for s, e in merged_intervals:
                if conflict.filter(start_time__lt=e, end_time__gt=s).exists():
                    transaction.set_rollback(True)
                    return Response({"detail": "Intervals overlap with other users bookings"}, status=409)

            for idx, (s, e) in enumerate(merged_intervals):
                if idx == 0:
                    base_booking.start_time = s
                    base_booking.end_time = e 
                    base_booking.save()
                    updated_base = True
                else:
                    bk = Booking.objects.create(user=user, desk=desk_locked, start_time=s, end_time=e)
                    created_objs.append(bk)
            
            desk_locked.refresh_booking_state()
            self._broadcast_desk_status(desk_locked)

            upsert_ids = [base_booking.pk] + [b.pk for b in created_objs]
            upsert_qs = Booking.objects.filter(pk__in=upsert_ids)

            self._broadcast_update_bookings(desk_locked, upsert_qs = upsert_qs, delete_ids=deleted_ids)

        return Response({
            "message": f"Updated booking and created {len(created_objs)} additional interval(s)",
            "deleted_ids": deleted_ids,
            "created_ids": [b.pk for b in created_objs],
            "updated_id": base_booking.pk,
            "intervals": [{"start_time": s.isoformat(), "end_time": e.isoformat()} for s, e in merged_intervals],
        }, status=200)
    
class UserLoginView(TokenObtainPairView):
    serializer_class = LoginTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:

            if "access" in response.data:
                access_token = response.data["access"]
                response.set_cookie(
                    key="access_token",
                    value=access_token,
                    httponly=True,
                    secure=True,
                    samesite="Strict",
                    max_age=60 * 5
                )
                del response.data["access"]
            
            if "refresh" in response.data:
                refresh_token = response.data["refresh"]
                del response.data["refresh"]
                response.set_cookie(
                    key="refresh_token",
                    value=refresh_token,
                    httponly=True,
                    secure=True,
                    samesite="Strict",
                    max_age=60*60*24
                )

        return response
    
class UserLogoutView(generics.GenericAPIView):
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        response = Response(
            {"detail": "Successfully logged out"},
            status = status.HTTP_205_RESET_CONTENT
        )
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except Exception as e:
                print(f"Error blacklisting token: {e}")
                pass
        
        response.delete_cookie("access_token")
        response.delete_cookie("refresh_token")

        return response
    
class CookieTokenRefreshView(APIView):
    """
    Refresh the access token using the refresh token from an HTTPONLY Cookie.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get("refresh_token")

        if not refresh_token:
            return Response(
                {"detail": "No refresh token cookie"},
                status = status.HTTP_401_UNAUTHORIZED
            )
        
        try:
            token = RefreshToken(refresh_token)
            new_access = str(token.access_token)

            response = Response(
                {"detail": "Token refreshed successfully"},
                status=status.HTTP_200_OK
            )

            response.set_cookie(
                key='access_token',
                value = new_access,
                httponly=True,
                secure=True,
                samesite='Strict',
                max_age=60*5
            )

            if settings.SIMPLE_JWT.get('ROTATE_REFRESH_TOKENS', False):
                new_refresh = str(token)
                response.set_cookie(
                    key='refresh_token',
                    value=new_refresh,
                    httponly=True,
                    secure=True,
                    samesite='Strict',
                    max_age=60 * 60 * 24
                )
            
            return response

        except TokenError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )

class MeView(APIView):
    """
    Return the logged-in user's basic info.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Check if user is a location manager or room manager
        is_location_manager = user.managed_locations.exists()
        is_room_manager = user.managed_rooms.exists()
        is_any_manager = is_location_manager or is_room_manager

        return Response({
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "is_staff": user.is_staff,
            "is_superuser": user.is_superuser,
            "is_location_manager": is_location_manager,
            "is_room_manager": is_room_manager,
            "is_any_manager": is_any_manager,
            "role": "Superuser" if user.is_superuser else ("Staff" if user.is_staff else "User"),
            "groups": [group.name for group in user.groups.all()],
        })