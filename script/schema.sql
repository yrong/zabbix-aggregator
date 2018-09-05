create table if not exists `triggers_statistic` (
   `hostid` bigint unsigned,
   `groupid`  bigint unsigned NOT NULL,
   `itemid` bigint unsigned  NOT NULL,
   `triggerid`   bigint unsigned   NOT NULL,
   `triggervalue`   integer    DEFAULT '0'  NOT NULL,
   `triggerpriority`   integer   DEFAULT '0'  NOT NULL,
   `lastchange`       integer    DEFAULT '0'  NOT NULL,
   `writtentime`       integer    DEFAULT '0'  NOT NULL
);