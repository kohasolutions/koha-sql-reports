#!/usr/bin/perl
# Runs made reports the way Koha's Reports module does (see koha-run.pl), returning their rows, with sample data that is
# put in one transaction first and always rolled back. Nothing is committed: no report is saved, and the counts of the
# tables it writes to are compared before and after (exit 3 when they differ).
#   koha-shell <instance> -c "perl /tmp/koha-prove.pl /tmp/prove.json"
# Input: { "setup": [ "INSERT …" ], "tables": [ "items", … ], "reports": [ { "id", "sql", "names": [], "values": [] } ] }
use Modern::Perl;
use JSON qw( decode_json );
use C4::Context;
use Koha;
use Koha::Database;
use Koha::Report;
use C4::Reports::Guided qw( execute_query );

my $file = shift or die "usage: koha-prove.pl <prove.json>\n";
open my $fh, '<:raw', $file or die "cannot read $file: $!\n";
my $in = decode_json( do { local $/; <$fh> } );

my $schema = Koha::Database->new->schema;
my $dbh    = C4::Context->dbh;
$dbh->{PrintError} = 0;

sub counts {
    return join ',', map { my ($n) = $dbh->selectrow_array("SELECT COUNT(*) FROM `$_`"); "$_=$n" } @{ $in->{tables} };
}
my $before = counts();
$schema->storage->txn_begin;
my ( @results, $setup_error );
eval {
    for my $s ( @{ $in->{setup} } ) {
        $dbh->do($s) or die "setup: $s\n" . $dbh->errstr . "\n";
    }
    1;
} or $setup_error = "$@";

if ( !$setup_error ) {
    local $SIG{__WARN__} = sub { };    # a failed report is reported below, once
    for my $r ( @{ $in->{reports} } ) {
        my %res    = ( id => $r->{id}, ok => JSON::false );
        my $report = Koha::Report->new( { savedsql => $r->{sql}, report_name => 'prove' } );
        my ( $valid, $errors ) = $report->is_sql_valid;
        if ( !$valid ) {
            $res{error} = 'Koha refuses to save it: ' . JSON->new->encode($errors);
        } else {
            my ($sql) = eval { $report->prep_report( [ @{ $r->{names} } ], [ @{ $r->{values} } ] ) };
            if ($@) {
                $res{error} = "prep_report: $@";
            } else {
                my ( $sth, $err ) = eval { execute_query( { sql => $sql, offset => 0, limit => 1000 } ) };
                if    ($@)   { $res{error} = "execute_query: $@" }
                elsif ($err) { $res{error} = 'execute_query: ' . JSON->new->encode($err) }
                else {
                    $res{columns} = [ @{ $sth->{NAME} } ];
                    my $rows = $sth->fetchall_arrayref;
                    $res{count} = scalar @$rows;
                    $res{rows}  = [ map { [ map { defined $_ ? "$_" : undef } @$_ ] } @$rows ] if $r->{rows};
                    $res{ok}    = JSON::true;
                }
            }
        }
        push @results, \%res;
    }
}
my $open = $schema->storage->transaction_depth;
$schema->storage->txn_rollback;
my $after = counts();
print JSON->new->utf8->encode(
    {
        koha_version => Koha::version(), db_version => $dbh->selectrow_array('SELECT VERSION()'),
        setup_error  => $setup_error, results => \@results, leaked => ( $before eq $after && $open == 1 ) ? undef : "before $before after $after depth $open",
    }
);
exit( $before eq $after && $open == 1 ? 0 : 3 );
