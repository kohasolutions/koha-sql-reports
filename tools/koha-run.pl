#!/usr/bin/perl
# Runs each report exactly the way Koha's Reports module does, inside a Koha instance:
#   1. Koha::Report->is_sql_valid    the checks Koha applies when a report is saved
#                                     (must start with SELECT, no UPDATE/DELETE/..., no credential columns)
#   2. Koha::Report->prep_report     fills in <<Prompt|type>> parameters the way Koha does
#   3. C4::Reports::Guided::execute_query   runs it with Koha's own paging LIMIT
#
# Nothing is saved: the report object is never stored and execute_query is given no report id, so the
# database is not changed. Run through koha-shell so KOHA_CONF and PERL5LIB are set:
#
#   koha-shell <instance> -c "perl /tmp/koha-run.pl /tmp/reports.json"
#
# Input: { "reports": [ { "slug": "...", "sql": "...", "parameters": [ { "placeholder": "Library|branches", "sample": "CPL" } ] } ] }
# Output (stdout, JSON): { "koha_version": "...", "results": [ { "slug", "ok", "rows", "columns", "ms", "error" } ] }
use Modern::Perl;
use JSON qw( decode_json encode_json );
use Time::HiRes qw( time );
use C4::Context;
use Koha;
use Koha::Report;
use C4::Reports::Guided qw( execute_query );

my $file = shift or die "usage: koha-run.pl <reports.json>\n";
open my $fh, '<:raw', $file or die "cannot read $file: $!\n";
my $input = decode_json( do { local $/; <$fh> } );

my @results;
for my $r ( @{ $input->{reports} } ) {
    my %res = ( slug => $r->{slug}, ok => JSON::false );
    my $report = Koha::Report->new( { savedsql => $r->{sql}, report_name => "check $r->{slug}" } );

    my ( $valid, $errors ) = $report->is_sql_valid;
    if ( !$valid ) {
        $res{error} = 'Koha refuses to save it: ' . encode_json($errors);
        push @results, \%res;
        next;
    }

    my @names  = map { $_->{placeholder} } @{ $r->{parameters} // [] };
    my @values = map { $_->{sample} } @{ $r->{parameters} // [] };
    my $sql    = eval { ( $report->prep_report( \@names, \@values ) )[0] };
    if ( my $e = $@ ) {
        $res{error} = "prep_report failed: $e";
        push @results, \%res;
        next;
    }

    my $t0 = time;
    my ( $sth, $exec_errors ) = execute_query( { sql => $sql, offset => 0, limit => 100000 } );
    $res{ms} = int( ( time - $t0 ) * 1000 );
    if ($exec_errors) {
        $res{error} = 'execute_query failed: ' . encode_json($exec_errors);
    } else {
        my $rows = $sth->fetchall_arrayref;
        $res{rows}    = scalar @$rows;
        $res{columns} = [ @{ $sth->{NAME} } ];
        $res{ok}      = JSON::true;
    }
    push @results, \%res;
}

print encode_json(
    {
        koha_version => Koha::version(),                          # the code, e.g. 26.05.02.002
        db_schema    => C4::Context->preference('Version'),       # the database's own version preference
        db_version   => C4::Context->dbh->selectrow_array('SELECT VERSION()'),
        results      => \@results,
    }
);
