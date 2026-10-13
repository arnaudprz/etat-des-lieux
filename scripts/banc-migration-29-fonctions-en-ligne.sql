CREATE OR REPLACE FUNCTION public.edl_these()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  with r as (
    select
      floor((reponses[11] + reponses[12]) / 2.0 + 0.5) >= 2 as confiance,
      floor((reponses[10] + reponses[13]) / 2.0 + 0.5) >= 2 as soutien,
      floor((reponses[1] + reponses[2] + reponses[5] + reponses[6]) / 4.0 + 0.5) >= 2 as cohesion,
      floor((reponses[14] + reponses[15]) / 2.0 + 0.5) >= 2 as engage,
      reponses[16] >= 2 as perf,
      reponses
    from etat_des_lieux.reponses
    where array_position(reponses, null) is null
  ), g as (
    select jsonb_build_object('n', count(*),
      'engages', case when count(*) >= 3 then round(100.0 * avg(engage::int)) end,
      'perf', case when count(*) >= 3 then round(100.0 * avg(perf::int)) end) as x, cle
    from (
      select 'toutes' as cle, engage, perf from r where confiance and soutien and cohesion
      union all select 'manque', engage, perf from r where not (confiance and soutien and cohesion)
      union all select 'confiance_avec', engage, perf from r where confiance
      union all select 'confiance_sans', engage, perf from r where not confiance
      union all select 'soutien_avec', engage, perf from r where soutien
      union all select 'soutien_sans', engage, perf from r where not soutien
      union all select 'cohesion_avec', engage, perf from r where cohesion
      union all select 'cohesion_sans', engage, perf from r where not cohesion
    ) t group by cle
  ), q as (
    select n, jsonb_build_object(
      'avec', jsonb_build_object('n', count(*) filter (where r.reponses[n] >= 2),
        'engages', case when count(*) filter (where r.reponses[n] >= 2) >= 3 then round(100.0 * avg(r.engage::int) filter (where r.reponses[n] >= 2)) end,
        'perf', case when count(*) filter (where r.reponses[n] >= 2) >= 3 then round(100.0 * avg(r.perf::int) filter (where r.reponses[n] >= 2)) end),
      'sans', jsonb_build_object('n', count(*) filter (where r.reponses[n] < 2),
        'engages', case when count(*) filter (where r.reponses[n] < 2) >= 3 then round(100.0 * avg(r.engage::int) filter (where r.reponses[n] < 2)) end,
        'perf', case when count(*) filter (where r.reponses[n] < 2) >= 3 then round(100.0 * avg(r.perf::int) filter (where r.reponses[n] < 2)) end)) as x
    from r cross join generate_series(1, 16) n group by n
  ), i as (
    select case when count(*) >= 3 then jsonb_build_object(
      'confiance', round(100.0 * avg((reponses[11] + reponses[12]) / 6.0)),
      'soutien', round(100.0 * avg((reponses[10] + reponses[13]) / 6.0)),
      'cohesion', round(100.0 * avg((reponses[1] + reponses[2] + reponses[5] + reponses[6]) / 12.0)),
      'engagement', round(100.0 * avg((reponses[14] + reponses[15]) / 6.0)),
      'performance', round(100.0 * avg(reponses[16] / 3.0))) end as x
    from r
  )
  select jsonb_build_object('ok', true, 'n', (select count(*) from r),
    'groupes', coalesce((select jsonb_object_agg(cle, x) from g), '{}'::jsonb),
    'questions', coalesce((select jsonb_object_agg(n::text, x) from q), '{}'::jsonb),
    'intensites', (select x from i))
$function$;
grant execute on function public.edl_these() to anon, authenticated;
CREATE OR REPLACE FUNCTION public.edl_souhaits()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
  with c as (
    select role, n, count(*) as concernes
    from etat_des_lieux.reponses r cross join generate_series(1, 16) n
    where r.reponses[n] is not null and r.reponses[n] <= 1
    group by role, n having count(*) >= 3
  ), ch as (
    select r.role, k.key::int as n, e.value #>> '{}' as choix, count(*) as choisis
    from etat_des_lieux.reponses r, jsonb_each(r.relances) k, jsonb_array_elements(k.value) e
    where e.value #>> '{}' <> 'autre'
    group by r.role, k.key, e.value #>> '{}'
  )
  select jsonb_build_object('ok', true, 'souhaits', coalesce(jsonb_agg(jsonb_build_object(
    'role', c.role, 'n', c.n, 'choix', ch.choix::int, 'concernes', c.concernes, 'choisis', ch.choisis,
    'p', round(100.0 * ch.choisis / c.concernes)) order by c.role, c.n, ch.choisis desc), '[]'::jsonb))
  from c join ch on ch.role = c.role and ch.n = c.n
$function$;
