# Источники каталога площадок

Проверено 11 ноября 2026 года по официальным сайтам. Каталог содержит пять реальных отелей Астаны. Основная вместимость `capacity` означает **банкетную рассадку**. `theaterCapacity` отдельно показывает театральную рассадку; эти значения нельзя подменять друг другом. Итоговую вместимость с декором, сценой и оборудованием следует уточнять у площадки.

| Площадка | Зал | Банкет | Театр / максимум мест | Площадь | Официальный источник |
|---|---|---:|---:|---:|---|
| The Ritz-Carlton, Astana | Grand Ballroom | 500 | 800 | 982 м² | https://www.ritzcarlton.com/en/hotels/tserz-the-ritz-carlton-astana/events/ |
| The St. Regis Astana | Astor Ballroom | 240 | 400 | 518,94 м² | https://www.marriott.com/en-us/hotels/tsexr-the-st-regis-astana/events/ |
| Hilton Astana | Grand Ballroom | 350 | 700 | 780 м² | https://www.hilton.com/en/hotels/tsekahi-hilton-astana/events/ |
| Rixos President Astana | крупнейший зал | 300 | 500 максимум мест | 492 м² | https://all.accor.com/hotel/B1Q3/index.en.shtml |
| Sheraton Astana Hotel | Ballroom | 180 | 450 | 445 м² | https://www.marriott.com/en-us/hotels/tsesi-sheraton-astana-hotel/events/ |

У Rixos опубликованы общие максимальные значения для мероприятий и площадь крупнейшего зала; конкретное имя зала и схема рассадки для максимума 500 мест на основной странице не уточнены. В API поле `theaterCapacity` равно `null`: подтверждённой театральной вместимости нет. Пользовательское сравнение и проверка числа гостей используют только банкетную вместимость 300. Максимум 500 мест не считается театральной рассадкой без уточнения у отеля.

Адреса взяты с официальных страниц отелей. Для St. Regis и Sheraton дополнительно проверены разделы Getting Here:
- https://www.marriott.com/en-us/hotels/tsexr-the-st-regis-astana/overview/
- https://www.marriott.com/en-us/hotels/tsesi-sheraton-astana-hotel/overview/

## Стоимость

Стоимость аренды залов в тенге в проверенных источниках не опубликована как единый тариф. Поэтому `price` равен `null`, а интерфейс показывает «По запросу». Опубликованные тарифы на питание не являются ценой аренды и намеренно не используются вместо неё. Бюджет пользователя остаётся бюджетом планирования; приложение не утверждает, что площадка в него укладывается.

## Фотографии

Все пять изображений загружены с официальных CDN отелей, сохранены локально в `backend/src/main/resources/static/images`. Изображения визуально проверены: это залы соответствующих отелей, а не стоковые фотографии.

- `ritz-carlton-astana.jpg`: https://cache.marriott.com/content/dam/marriott-renditions/TSERZ/tserz-ballroom-0033-hor-wide.jpg?output-quality=85&downsize=1600px:*
- `st-regis-astana.jpg`: https://cache.marriott.com/content/dam/marriott-renditions/TSEXR/tsexr-astor-ballroom-7980-hor-wide.jpg?output-quality=85&downsize=1600px:*
- `hilton-astana.jpg`: https://www.hilton.com/im/en/TSEKAHI/1172513/grand-ballroom.jpg?ch=2358&cw=5619&gravity=NorthWest&impolicy=crop&rh=806&rw=1920&xposition=0&yposition=576
- `rixos-president-astana.jpg`: https://www.ahstatic.com/photos/b1q3_sm_00_p_2048x1536.jpg
- `sheraton-astana.jpg`: https://cache.marriott.com/is/image/marriotts7prod/si-tsesi-weddings-and-occ-18593-00342:Classic-Hor?fit=constrain&wid=1600

Правообладатели фотографий: Marriott International / соответствующие отели, Hilton, Accor / Rixos. Ссылки служат атрибуцией и не означают свободную лицензию. Фотографии включены в локальный учебный прототип для демонстрации; перед публичным коммерческим использованием необходимо получить разрешение правообладателей или заменить изображения на лицензированные.

## Расширение до 50 площадок

Добавлять записи в `catalog.json` с уникальными `id` и `slug`, сохранять фотографии локально и указывать официальный источник, дату проверки, точный вид рассадки и опубликованную цену либо `null`. Не добавлять выдуманные отзывы, рейтинги, свободные даты и цены.